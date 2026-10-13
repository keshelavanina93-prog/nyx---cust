/**
 * Generate and store export files (SAD XML / field sheet snapshot / XLS). Gates (brief rules 2,3,5,6):
 * - every line human_confirmed; calculation approved; placeholder tariff blocked in production;
 * - XML behind FEATURE_XML_EXPORT and marked experimental until validated.
 */
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { loadShipmentFull, loadSettings } from "@/lib/shipments/queries";
import { buildDeclarationModel } from "./build-model";
import { buildSadXml } from "./sad-xml/builder";
import { buildXlsx } from "./xls/build";
import { buildSheet } from "./sheet/fields";
import { putFile } from "@/lib/storage";
import { audit } from "@/lib/audit/log";
import type { DeclarationModel } from "./model";

export type ExportKind = "sad_xml" | "xls" | "sheet_pdf";

export type ExportGate = { ok: true } | { ok: false; reason: "unconfirmed_hs" | "not_approved" | "placeholder_tariff" | "xml_disabled" | "no_calculation" };

export function isProduction() {
  return process.env.NODE_ENV === "production" && process.env.ALLOW_PLACEHOLDER_EXPORT !== "true";
}

export async function exportGate(db: Db, orgId: string, shipmentId: string, kind: ExportKind): Promise<ExportGate> {
  const full = await loadShipmentFull(db, orgId, shipmentId);
  if (full.lines.some((l) => !full.decisionByLine.get(l.id)?.humanConfirmed)) return { ok: false, reason: "unconfirmed_hs" };
  if (!full.calculation) return { ok: false, reason: "no_calculation" };
  if (!full.calculation.approved) return { ok: false, reason: "not_approved" };
  const tariff = await db.query.tariffVersions.findFirst({ where: eq(schema.tariffVersions.id, full.calculation.tariffVersionId) });
  if (tariff?.isPlaceholder && isProduction()) return { ok: false, reason: "placeholder_tariff" };
  if (kind === "sad_xml" && process.env.FEATURE_XML_EXPORT === "false") return { ok: false, reason: "xml_disabled" };
  return { ok: true };
}

export async function buildModelForShipment(db: Db, orgId: string, shipmentId: string): Promise<DeclarationModel> {
  const full = await loadShipmentFull(db, orgId, shipmentId);
  if (!full.calculation) throw new Error("no calculation");
  const org = (await db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) }))!;
  const tariff = (await db.query.tariffVersions.findFirst({ where: eq(schema.tariffVersions.id, full.calculation.tariffVersionId) }))!;
  const settings = await loadSettings(db);
  const feeRef = full.calculation.feeAlternatives.find((f) => f.mode === full.calculation!.feeMode)?.legal_ref ?? "Decree №96";
  return buildDeclarationModel(full, { name: org.name, taxId: org.taxId, address: org.address }, { id: tariff.id, source: tariff.source, effectiveFrom: tariff.effectiveFrom, isPlaceholder: tariff.isPlaceholder }, { xmlValidated: settings.xmlValidated, feeLegalRef: feeRef });
}

export async function generateExport(db: Db, ctx: { orgId: string; userId: string }, shipmentId: string, kind: ExportKind) {
  const gate = await exportGate(db, ctx.orgId, shipmentId, kind);
  if (!gate.ok) throw new Error(`export blocked: ${gate.reason}`);
  const model = await buildModelForShipment(db, ctx.orgId, shipmentId);
  const full = await loadShipmentFull(db, ctx.orgId, shipmentId);
  const ref = full.shipment.reference.replace(/[^\w.-]+/g, "_");
  let data: Buffer;
  let fileName: string;
  let mime: string;
  if (kind === "sad_xml") {
    data = Buffer.from(buildSadXml(model), "utf8");
    fileName = `SAD-${ref}.xml`;
    mime = "application/xml";
  } else if (kind === "xls") {
    data = await buildXlsx(model);
    fileName = `declaration-${ref}.xlsx`;
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else {
    data = Buffer.from(JSON.stringify({ model, sheet: buildSheet(model) }, null, 2), "utf8");
    fileName = `sheet-${ref}.json`;
    mime = "application/json";
  }
  const stored = await putFile(ctx.orgId, fileName, data, mime);
  const [row] = await db
    .insert(schema.exportsTable)
    .values({
      organizationId: ctx.orgId,
      shipmentId,
      calculationId: full.calculation!.id,
      kind,
      blobUrl: stored.url,
      fileName,
      xmlProfileVersion: kind === "sad_xml" ? model.profileVersion : null,
      validatedAgainstRealSample: kind === "sad_xml" ? model.validatedAgainstRealSample : false,
      createdBy: ctx.userId,
    })
    .returning();
  await db.insert(schema.usageEvents).values({ organizationId: ctx.orgId, kind: "declaration_exported", refId: row!.id });
  if (full.shipment.status === "approved") await db.update(schema.shipments).set({ status: "exported" }).where(eq(schema.shipments.id, shipmentId));
  await audit({ organizationId: ctx.orgId, actorType: "user", actorId: ctx.userId, entity: "exports", entityId: row!.id, action: "export", after: { kind, fileName, profile: model.profileVersion, experimental: model.experimental } }, db);
  return row!;
}
