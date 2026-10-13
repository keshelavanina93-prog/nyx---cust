import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";

export async function loadShipment(db: Db, orgId: string, id: string) {
  const s = await db.query.shipments.findFirst({ where: and(eq(schema.shipments.organizationId, orgId), eq(schema.shipments.id, id)) });
  if (!s) notFound();
  return s;
}

export async function loadShipmentFull(db: Db, orgId: string, id: string) {
  const shipment = await loadShipment(db, orgId, id);
  const [documents, lines, calcs, exportsRows, checklistRows, supplier] = await Promise.all([
    db.select().from(schema.documents).where(and(eq(schema.documents.organizationId, orgId), eq(schema.documents.shipmentId, id))).orderBy(asc(schema.documents.createdAt)),
    db.select().from(schema.invoiceLines).where(and(eq(schema.invoiceLines.organizationId, orgId), eq(schema.invoiceLines.shipmentId, id))).orderBy(asc(schema.invoiceLines.lineNo)),
    db.select().from(schema.calculations).where(and(eq(schema.calculations.organizationId, orgId), eq(schema.calculations.shipmentId, id))).orderBy(desc(schema.calculations.version)).limit(1),
    db.select().from(schema.exportsTable).where(and(eq(schema.exportsTable.organizationId, orgId), eq(schema.exportsTable.shipmentId, id))).orderBy(desc(schema.exportsTable.createdAt)),
    db.select().from(schema.checklists).where(and(eq(schema.checklists.organizationId, orgId), eq(schema.checklists.shipmentId, id))),
    shipment.supplierId ? db.query.suppliers.findFirst({ where: and(eq(schema.suppliers.organizationId, orgId), eq(schema.suppliers.id, shipment.supplierId)) }) : Promise.resolve(undefined),
  ]);
  const decisions = lines.length
    ? await db.select().from(schema.hsDecisions).where(and(eq(schema.hsDecisions.organizationId, orgId), inArray(schema.hsDecisions.invoiceLineId, lines.map((l) => l.id))))
    : [];
  const decisionByLine = new Map(decisions.map((d) => [d.invoiceLineId, d]));
  return { shipment, documents, lines, decisions, decisionByLine, calculation: calcs[0] ?? null, exports: exportsRows, checklists: checklistRows, supplier: supplier ?? null };
}
export type ShipmentFull = Awaited<ReturnType<typeof loadShipmentFull>>;

export type AppSettings = {
  hsYellow: number;
  hsRed: number;
  valueRisk: { windowDays: number; minSamples: number; mediumBelowPct: number; highBelowPct: number };
  rounding: "half_up" | "half_even" | "down" | "up";
  vatIncludesExcise: boolean;
  xmlValidated: boolean;
};

export async function loadSettings(db: Db): Promise<AppSettings> {
  const rows = await db.select().from(schema.appSettings);
  const get = <T,>(k: string, d: T): T => (rows.find((r) => r.key === k)?.value as T) ?? d;
  return {
    hsYellow: Number(get("hs_confidence_yellow", 0.75)),
    hsRed: Number(get("hs_confidence_red", 0.5)),
    valueRisk: get("value_risk", { windowDays: 90, minSamples: 3, mediumBelowPct: 20, highBelowPct: 40 }),
    rounding: get("rounding_mode", "half_up"),
    vatIncludesExcise: get("vat_includes_excise", true),
    xmlValidated: get("xml_validated_against_real_sample", false),
  };
}

export async function loadActiveTariff(db: Db) {
  return db.query.tariffVersions.findFirst({ where: eq(schema.tariffVersions.isActive, true) });
}

export async function loadReferenceData(db: Db) {
  const [feeRows, wh, hol, pen, gov] = await Promise.all([
    db.select().from(schema.feeSchedules).orderBy(desc(schema.feeSchedules.effectiveFrom)),
    db.select().from(schema.workingHours),
    db.select().from(schema.holidays),
    db.select().from(schema.penaltyRules),
    db.query.countryProfiles.findFirst({ where: eq(schema.countryProfiles.countryCode, "GE") }),
  ]);
  // Use the latest effective_from set
  const latest = feeRows[0]?.effectiveFrom;
  const fees = feeRows.filter((f) => f.effectiveFrom === latest);
  return { fees, workingHours: wh, holidays: hol, penaltyRules: pen, countryProfile: gov ?? null };
}

export async function loadPriceReferences(db: Db, orgId: string, hsCodes: string[], sinceIso: string) {
  if (!hsCodes.length) return [];
  return db
    .select()
    .from(schema.priceReferences)
    .where(and(eq(schema.priceReferences.organizationId, orgId), inArray(schema.priceReferences.hsCode, hsCodes), gte(schema.priceReferences.observedAt, sinceIso)));
}

export async function loadEcustomsProfile(db: Db, orgId: string) {
  let p = await db.query.ecustomsProfiles.findFirst({ where: eq(schema.ecustomsProfiles.organizationId, orgId) });
  if (!p) {
    const [created] = await db.insert(schema.ecustomsProfiles).values({ organizationId: orgId }).returning();
    p = created!;
  }
  return p;
}

export function unconfirmedLines(full: ShipmentFull) {
  return full.lines.filter((l) => !full.decisionByLine.get(l.id)?.humanConfirmed);
}
