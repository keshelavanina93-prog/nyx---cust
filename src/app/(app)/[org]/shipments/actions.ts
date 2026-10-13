"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import Decimal from "decimal.js";
import { getDb, schema } from "@/db/client";
import { requireOrg, type OrgContext } from "@/lib/org";
import { audit } from "@/lib/audit/log";
import { putFile, getFile, sha256, ALLOWED_MIME, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { extractInvoice } from "@/lib/ai/extract";
import { aiIsMock } from "@/lib/ai/provider";
import { classifyLine, productKey } from "@/lib/ai/classify";
import { loadShipmentFull, loadActiveTariff, loadSettings } from "@/lib/shipments/queries";
import { runAndStoreCalculation } from "@/lib/customs/run";
import { setManualRate, syncNbgRates } from "@/lib/customs/fx-db";
import { generateExport, type ExportKind } from "@/lib/export/run";
import { ensureChecklist, toggleChecklistItem } from "@/lib/shipments/checklists";
import { getTariffLineByCode } from "@/lib/tariff/search";
import { defaultMode } from "@/lib/customs/fees";
import { todayIso } from "@/lib/utils";

const dec = z.string().trim().regex(/^-?\d+([.,]\d{1,4})?$/).transform((v) => v.replace(",", "."));
const decOpt = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.replace(",", ".") : null))
  .pipe(z.string().regex(/^-?\d+(\.\d{1,4})?$/).nullable());
const str = (max = 200) => z.string().trim().max(max);
const strOpt = (max = 200) => z.string().trim().max(max).optional().transform((v) => v || null);

function base(ctx: OrgContext, id?: string) {
  return `/${ctx.org.slug}/shipments${id ? `/${id}` : ""}`;
}
function log(ctx: OrgContext, entity: string, entityId: string | null, action: string, before?: unknown, after?: unknown) {
  return audit({ organizationId: ctx.org.id, actorType: "user", actorId: ctx.user.id, entity, entityId, action, before, after, ip: ctx.ip, userAgent: ctx.userAgent });
}

/* ------------------------------------------------------------------ */
/* Create / intake                                                     */
/* ------------------------------------------------------------------ */
export async function createShipmentAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const p = z
    .object({ reference: str(80).min(1), supplierId: z.string().uuid().optional().or(z.literal("")), goodsArrived: z.coerce.boolean(), expectedArrival: strOpt(10), destinationOffice: strOpt(10) })
    .parse({ reference: formData.get("reference"), supplierId: formData.get("supplierId") ?? "", goodsArrived: formData.get("goodsArrived") === "on", expectedArrival: formData.get("expectedArrival") ?? "", destinationOffice: formData.get("destinationOffice") ?? "" });
  const supplier = p.supplierId ? await db.query.suppliers.findFirst({ where: and(eq(schema.suppliers.organizationId, ctx.org.id), eq(schema.suppliers.id, p.supplierId)) }) : null;
  const [s] = await db
    .insert(schema.shipments)
    .values({
      organizationId: ctx.org.id,
      supplierId: supplier?.id ?? null,
      reference: p.reference,
      mode: defaultMode(p.goodsArrived),
      goodsAlreadyArrived: p.goodsArrived,
      expectedArrivalDate: p.expectedArrival,
      destinationOffice: p.destinationOffice,
      incoterm: supplier?.defaultIncoterm ?? null,
      currency: supplier?.defaultCurrency ?? ctx.org.defaultCurrency,
      originCountry: supplier?.defaultOriginCountry ?? null,
      dispatchCountry: supplier?.country ?? null,
      declarationRegistrationDate: todayIso(),
      createdBy: ctx.user.id,
    })
    .returning();
  await log(ctx, "shipments", s!.id, "create", null, { reference: p.reference, mode: s!.mode });
  redirect(`${base(ctx, s!.id)}/intake`);
}

export async function uploadDocumentAction(orgSlug: string, shipmentId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  await loadShipmentFull(db, ctx.org.id, shipmentId);
  const kind = z.enum(schema.documentKind.enumValues).parse(formData.get("kind") ?? "invoice");
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of files) {
    const mime = f.type || (f.name.endsWith(".json") ? "application/json" : "application/octet-stream");
    const allowed = ALLOWED_MIME.has(mime) || (aiIsMock() && mime === "application/json");
    if (!allowed) throw new Error(`file type not allowed: ${mime}`);
    if (f.size > MAX_UPLOAD_BYTES) throw new Error("file too large (max 20MB)");
    const buf = Buffer.from(await f.arrayBuffer());
    const stored = await putFile(ctx.org.id, f.name, buf, mime);
    const [doc] = await db
      .insert(schema.documents)
      .values({ organizationId: ctx.org.id, shipmentId, kind, fileName: f.name, blobUrl: stored.url, mime, sizeBytes: buf.length, source: "upload", sha256: sha256(buf) })
      .returning();
    await log(ctx, "documents", doc!.id, "upload", null, { kind, fileName: f.name, size: buf.length });
  }
  revalidatePath(`${base(ctx, shipmentId)}/intake`);
}

export async function extractAction(orgSlug: string, shipmentId: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const full = await loadShipmentFull(db, ctx.org.id, shipmentId);
  const invoices = full.documents.filter((d) => d.kind === "invoice");
  if (!invoices.length) throw new Error("no invoice uploaded");
  await db.update(schema.shipments).set({ status: "extracting" }).where(eq(schema.shipments.id, shipmentId));
  const files = await Promise.all(invoices.map(async (d) => ({ name: d.fileName, mime: d.mime, data: await getFile(d.blobUrl) })));
  const { extraction, aiRunId, totalsMismatch } = await extractInvoice(files, { organizationId: ctx.org.id, shipmentId });

  await db.delete(schema.invoiceLines).where(and(eq(schema.invoiceLines.organizationId, ctx.org.id), eq(schema.invoiceLines.shipmentId, shipmentId)));
  for (const l of extraction.lines) {
    await db.insert(schema.invoiceLines).values({
      organizationId: ctx.org.id,
      shipmentId,
      lineNo: l.line_no,
      descriptionRaw: l.description_raw,
      descriptionNormalizedKa: l.description_normalized_ka,
      sku: l.sku,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unit_price,
      lineTotal: new Decimal(l.line_total).toFixed(2),
      currency: extraction.currency.toUpperCase(),
      originCountry: l.origin_country?.toUpperCase() ?? extraction.origin_country?.toUpperCase() ?? null,
      netWeightKg: l.net_weight_kg,
      grossWeightKg: l.gross_weight_kg,
      extractionConfidence: l.confidence.toFixed(3),
      sourceBbox: l.bbox,
    });
  }
  const before = { currency: full.shipment.currency, incoterm: full.shipment.incoterm, invoiceTotal: full.shipment.invoiceTotal };
  const after = {
    status: "review_lines" as const,
    currency: extraction.currency.toUpperCase(),
    incoterm: extraction.incoterm?.toUpperCase() ?? full.shipment.incoterm,
    incotermPlace: extraction.incoterm_place ?? full.shipment.incotermPlace,
    invoiceNumber: extraction.invoice_number,
    invoiceDate: extraction.invoice_date,
    invoiceTotal: new Decimal(extraction.invoice_total).toFixed(2),
    freightAmount: extraction.freight_amount ? new Decimal(extraction.freight_amount).toFixed(2) : full.shipment.freightAmount,
    freightCurrency: extraction.freight_amount ? extraction.currency.toUpperCase() : full.shipment.freightCurrency,
    insuranceAmount: extraction.insurance_amount ? new Decimal(extraction.insurance_amount).toFixed(2) : full.shipment.insuranceAmount,
    insuranceCurrency: extraction.insurance_amount ? extraction.currency.toUpperCase() : full.shipment.insuranceCurrency,
    grossWeightKg: extraction.gross_weight_kg ?? full.shipment.grossWeightKg,
    netWeightKg: extraction.net_weight_kg ?? full.shipment.netWeightKg,
    packages: extraction.packages ?? full.shipment.packages,
    originCountry: extraction.origin_country?.toUpperCase() ?? full.shipment.originCountry,
    dispatchCountry: extraction.supplier.country?.toUpperCase() ?? full.shipment.dispatchCountry,
    supplierNameRaw: extraction.supplier.name,
    buyerNameRaw: extraction.buyer.name,
  };
  await db.update(schema.shipments).set(after).where(eq(schema.shipments.id, shipmentId));
  await db.update(schema.documents).set({ extractionStatus: "done" }).where(inArray(schema.documents.id, invoices.map((d) => d.id)));
  await audit({ organizationId: ctx.org.id, actorType: "ai", actorId: aiRunId, entity: "shipments", entityId: shipmentId, action: "extract", before, after: { ...after, lines: extraction.lines.length, totalsMismatch, warnings: extraction.warnings } });
  redirect(`${base(ctx, shipmentId)}/lines`);
}

/* ------------------------------------------------------------------ */
/* Lines & details                                                     */
/* ------------------------------------------------------------------ */
const lineSchema = z.object({
  id: z.string().uuid(),
  descriptionRaw: str(1000).min(1),
  descriptionNormalizedKa: strOpt(1000),
  sku: strOpt(100),
  quantity: dec,
  unit: strOpt(20),
  unitPrice: dec,
  lineTotal: dec,
  originCountry: strOpt(2).transform((v) => v?.toUpperCase() ?? null),
  netWeightKg: decOpt,
  grossWeightKg: decOpt,
});

export async function saveLinesAction(orgSlug: string, shipmentId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const full = await loadShipmentFull(db, ctx.org.id, shipmentId);
  const ids = formData.getAll("lineId").map(String);
  for (const id of ids) {
    const g = (k: string) => formData.get(`${k}:${id}`) ?? "";
    const p = lineSchema.parse({ id, descriptionRaw: g("descriptionRaw"), descriptionNormalizedKa: g("descriptionNormalizedKa"), sku: g("sku"), quantity: g("quantity"), unit: g("unit"), unitPrice: g("unitPrice"), lineTotal: g("lineTotal"), originCountry: g("originCountry"), netWeightKg: g("netWeightKg"), grossWeightKg: g("grossWeightKg") });
    const before = full.lines.find((l) => l.id === id);
    if (!before) continue;
    const changed = Object.entries(p).some(([k, v]) => k !== "id" && String((before as Record<string, unknown>)[k] ?? "") !== String(v ?? ""));
    if (!changed) continue;
    const { id: _id, ...set } = p;
    await db
      .update(schema.invoiceLines)
      .set({ ...set, lineTotal: new Decimal(p.lineTotal).toFixed(2), editedByHuman: true })
      .where(and(eq(schema.invoiceLines.organizationId, ctx.org.id), eq(schema.invoiceLines.id, id)));
    // Edited description invalidates an unconfirmed decision
    if (before.descriptionRaw !== p.descriptionRaw) await db.delete(schema.hsDecisions).where(and(eq(schema.hsDecisions.invoiceLineId, id), eq(schema.hsDecisions.humanConfirmed, false)));
    await log(ctx, "invoice_lines", id, "edit", before, set);
  }
  const detail = z
    .object({ incoterm: strOpt(3).transform((v) => v?.toUpperCase() ?? null), incotermPlace: strOpt(120), currency: str(3).min(3), invoiceNumber: strOpt(60), invoiceDate: strOpt(10), invoiceTotal: decOpt, freightAmount: decOpt, freightCurrency: strOpt(3), insuranceAmount: decOpt, insuranceCurrency: strOpt(3), originCountry: strOpt(2), dispatchCountry: strOpt(2), transportMode: strOpt(10), transportDocNo: strOpt(60), borderPost: strOpt(60), destinationOffice: strOpt(10), grossWeightKg: decOpt, netWeightKg: decOpt, packages: z.coerce.number().int().nullable().optional(), expectedArrivalDate: strOpt(10), declarationRegistrationDate: strOpt(10), allocationBasis: z.enum(["value", "weight"]).default("value"), mode: z.enum(schema.feeMode.enumValues).optional() })
    .parse({
      incoterm: formData.get("incoterm") ?? "", incotermPlace: formData.get("incotermPlace") ?? "", currency: formData.get("currency") ?? full.shipment.currency, invoiceNumber: formData.get("invoiceNumber") ?? "", invoiceDate: formData.get("invoiceDate") ?? "", invoiceTotal: formData.get("invoiceTotal") ?? "",
      freightAmount: formData.get("freightAmount") ?? "", freightCurrency: formData.get("freightCurrency") ?? "", insuranceAmount: formData.get("insuranceAmount") ?? "", insuranceCurrency: formData.get("insuranceCurrency") ?? "",
      originCountry: formData.get("originCountry") ?? "", dispatchCountry: formData.get("dispatchCountry") ?? "", transportMode: formData.get("transportMode") ?? "", transportDocNo: formData.get("transportDocNo") ?? "", borderPost: formData.get("borderPost") ?? "", destinationOffice: formData.get("destinationOffice") ?? "",
      grossWeightKg: formData.get("grossWeightKg") ?? "", netWeightKg: formData.get("netWeightKg") ?? "", packages: formData.get("packages") ? Number(formData.get("packages")) : null, expectedArrivalDate: formData.get("expectedArrivalDate") ?? "", declarationRegistrationDate: formData.get("declarationRegistrationDate") ?? "", allocationBasis: formData.get("allocationBasis") ?? "value", mode: formData.get("mode") ?? undefined,
    });
  const set = { ...detail, currency: detail.currency.toUpperCase(), originCountry: detail.originCountry?.toUpperCase() ?? null, dispatchCountry: detail.dispatchCountry?.toUpperCase() ?? null, freightCurrency: detail.freightCurrency?.toUpperCase() ?? null, insuranceCurrency: detail.insuranceCurrency?.toUpperCase() ?? null, packages: detail.packages ?? null };
  await db.update(schema.shipments).set({ ...set, status: full.shipment.status === "draft" || full.shipment.status === "extracting" ? "review_lines" : full.shipment.status }).where(eq(schema.shipments.id, shipmentId));
  await log(ctx, "shipments", shipmentId, "edit_details", { incoterm: full.shipment.incoterm, currency: full.shipment.currency, freightAmount: full.shipment.freightAmount, declarationRegistrationDate: full.shipment.declarationRegistrationDate }, set);
  const goHs = formData.get("next") === "hs";
  if (goHs) {
    await db.update(schema.shipments).set({ status: "classifying" }).where(and(eq(schema.shipments.id, shipmentId), inArray(schema.shipments.status, ["review_lines", "draft", "extracting"])));
    redirect(`${base(ctx, shipmentId)}/hs`);
  }
  revalidatePath(`${base(ctx, shipmentId)}/lines`);
}

export async function addLineAction(orgSlug: string, shipmentId: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const full = await loadShipmentFull(db, ctx.org.id, shipmentId);
  const lineNo = (full.lines.at(-1)?.lineNo ?? 0) + 1;
  const [l] = await db.insert(schema.invoiceLines).values({ organizationId: ctx.org.id, shipmentId, lineNo, descriptionRaw: "—", quantity: "1", unitPrice: "0", lineTotal: "0.00", currency: full.shipment.currency, editedByHuman: true }).returning();
  await log(ctx, "invoice_lines", l!.id, "add", null, { lineNo });
  revalidatePath(`${base(ctx, shipmentId)}/lines`);
}

export async function deleteLineAction(orgSlug: string, shipmentId: string, lineId: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const before = await db.query.invoiceLines.findFirst({ where: and(eq(schema.invoiceLines.organizationId, ctx.org.id), eq(schema.invoiceLines.id, lineId), eq(schema.invoiceLines.shipmentId, shipmentId)) });
  if (!before) return;
  await db.delete(schema.invoiceLines).where(eq(schema.invoiceLines.id, lineId));
  await log(ctx, "invoice_lines", lineId, "delete", before, null);
  revalidatePath(`${base(ctx, shipmentId)}/lines`);
}

/* ------------------------------------------------------------------ */
/* HS                                                                  */
/* ------------------------------------------------------------------ */
export async function classifyAction(orgSlug: string, shipmentId: string, onlyLineId?: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const full = await loadShipmentFull(db, ctx.org.id, shipmentId);
  const tariff = await loadActiveTariff(db);
  if (!tariff) throw new Error("no active tariff version");
  const settings = await loadSettings(db);
  const targets = full.lines.filter((l) => (onlyLineId ? l.id === onlyLineId : !full.decisionByLine.get(l.id)?.humanConfirmed));
  for (const l of targets) {
    const res = await classifyLine(db, { id: l.id, descriptionRaw: l.descriptionRaw, descriptionNormalizedKa: l.descriptionNormalizedKa, sku: l.sku, quantity: l.quantity, unit: l.unit, originCountry: l.originCountry }, { organizationId: ctx.org.id, shipmentId, supplierId: full.shipment.supplierId, supplierName: full.supplier?.name ?? full.shipment.supplierNameRaw, tariffVersionId: tariff.id });
    const top = res.candidates[0];
    const values = {
      organizationId: ctx.org.id,
      invoiceLineId: l.id,
      candidates: res.candidates,
      questionsForUser: res.questionsForUser,
      suggestedHsCode: top?.hs_code ?? null,
      suggestedConfidence: top ? top.confidence.toFixed(3) : null,
      source: res.source,
      memoryTimesConfirmed: res.memoryTimesConfirmed,
      finalHsCode: null,
      humanConfirmed: false,
      confirmedBy: null,
      confirmedAt: null,
      advanceRulingRecommended: !!top && top.confidence < settings.hsRed,
      tariffVersionId: tariff.id,
      aiRunId: res.aiRunId,
    };
    const before = full.decisionByLine.get(l.id);
    await db.insert(schema.hsDecisions).values(values).onConflictDoUpdate({ target: schema.hsDecisions.invoiceLineId, set: values });
    await audit({ organizationId: ctx.org.id, actorType: "ai", actorId: res.aiRunId, entity: "hs_decisions", entityId: l.id, action: "classify", before: before ? { suggested: before.suggestedHsCode } : null, after: { suggested: top?.hs_code, confidence: top?.confidence, source: res.source } });
  }
  await db.update(schema.shipments).set({ status: "classifying" }).where(and(eq(schema.shipments.id, shipmentId), inArray(schema.shipments.status, ["review_lines", "draft", "extracting"])));
  revalidatePath(`${base(ctx, shipmentId)}/hs`);
}

async function confirmOne(ctx: OrgContext, shipmentId: string, lineId: string, hsCode: string, source: "ai" | "client_memory" | "manual", reason: string | null) {
  const db = await getDb();
  const tariff = await loadActiveTariff(db);
  if (!tariff) throw new Error("no active tariff");
  const tl = await getTariffLineByCode(db, hsCode, tariff.id);
  if (!tl) throw new Error(`HS ${hsCode} not in active tariff`);
  const line = await db.query.invoiceLines.findFirst({ where: and(eq(schema.invoiceLines.organizationId, ctx.org.id), eq(schema.invoiceLines.id, lineId), eq(schema.invoiceLines.shipmentId, shipmentId)) });
  if (!line) throw new Error("line not found");
  const before = await db.query.hsDecisions.findFirst({ where: and(eq(schema.hsDecisions.organizationId, ctx.org.id), eq(schema.hsDecisions.invoiceLineId, lineId)) });
  const set = { finalHsCode: hsCode, humanConfirmed: true, confirmedBy: ctx.user.id, confirmedAt: new Date(), overrideReason: reason, source: before && before.suggestedHsCode === hsCode ? before.source : source, tariffVersionId: tariff.id };
  if (before) await db.update(schema.hsDecisions).set(set).where(eq(schema.hsDecisions.id, before.id));
  else await db.insert(schema.hsDecisions).values({ organizationId: ctx.org.id, invoiceLineId: lineId, candidates: [{ hs_code: hsCode, confidence: 1, reasoning_ka: "ხელით არჩეული", citations: [{ tariff_line_id: tl.id, quote: tl.descriptionKa.slice(0, 80) }], gri_rules: [], duty_rate: tl.dutyRate, description_ka: tl.descriptionKa }], suggestedHsCode: hsCode, suggestedConfidence: "1.000", ...set });
  await log(ctx, "hs_decisions", lineId, "confirm", before ? { final: before.finalHsCode, confirmed: before.humanConfirmed } : null, { final: hsCode, source: set.source, reason });

  // Client memory: written ONLY from human-confirmed decisions (org-scoped)
  const shipment = await db.query.shipments.findFirst({ where: eq(schema.shipments.id, shipmentId) });
  const key = productKey(line.descriptionRaw, line.sku);
  const supplierId = shipment?.supplierId ?? null;
  const existing = await db.query.clientMemory.findFirst({ where: and(eq(schema.clientMemory.organizationId, ctx.org.id), eq(schema.clientMemory.productKey, key), supplierId ? eq(schema.clientMemory.supplierId, supplierId) : sql`${schema.clientMemory.supplierId} is null`) });
  if (existing) {
    await db.update(schema.clientMemory).set({ hsCode, timesConfirmed: existing.hsCode === hsCode ? existing.timesConfirmed + 1 : 1, lastConfirmedAt: new Date(), lastShipmentId: shipmentId, descriptionRaw: line.descriptionRaw }).where(eq(schema.clientMemory.id, existing.id));
  } else {
    await db.insert(schema.clientMemory).values({ organizationId: ctx.org.id, supplierId, productKey: key, descriptionRaw: line.descriptionRaw, hsCode, timesConfirmed: 1, lastShipmentId: shipmentId });
  }
}

export async function confirmHsAction(orgSlug: string, shipmentId: string, lineId: string, hsCode: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  await confirmOne(ctx, shipmentId, lineId, z.string().regex(/^\d{10}$/).parse(hsCode), "ai", null);
  revalidatePath(`${base(ctx, shipmentId)}/hs`);
}

export async function setManualHsAction(orgSlug: string, shipmentId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const p = z.object({ lineId: z.string().uuid(), hsCode: z.string().regex(/^\d{10}$/), reason: str(500).min(3) }).parse({ lineId: formData.get("lineId"), hsCode: String(formData.get("hsCode") ?? "").replace(/\s+/g, ""), reason: formData.get("reason") });
  await confirmOne(ctx, shipmentId, p.lineId, p.hsCode, "manual", p.reason);
  revalidatePath(`${base(ctx, shipmentId)}/hs`);
}

export async function confirmAllGreenAction(orgSlug: string, shipmentId: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const full = await loadShipmentFull(db, ctx.org.id, shipmentId);
  const settings = await loadSettings(db);
  for (const l of full.lines) {
    const d = full.decisionByLine.get(l.id);
    if (!d || d.humanConfirmed || !d.suggestedHsCode) continue;
    if (Number(d.suggestedConfidence ?? 0) < settings.hsYellow) continue;
    await confirmOne(ctx, shipmentId, l.id, d.suggestedHsCode, d.source === "client_memory" ? "client_memory" : "ai", "bulk_confirm_green");
  }
  revalidatePath(`${base(ctx, shipmentId)}/hs`);
}

export async function unconfirmHsAction(orgSlug: string, shipmentId: string, lineId: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const before = await db.query.hsDecisions.findFirst({ where: and(eq(schema.hsDecisions.organizationId, ctx.org.id), eq(schema.hsDecisions.invoiceLineId, lineId)) });
  if (!before) return;
  await db.update(schema.hsDecisions).set({ humanConfirmed: false, finalHsCode: null, confirmedBy: null, confirmedAt: null }).where(eq(schema.hsDecisions.id, before.id));
  await log(ctx, "hs_decisions", lineId, "unconfirm", { final: before.finalHsCode }, null);
  revalidatePath(`${base(ctx, shipmentId)}/hs`);
}

export async function goToCalcAction(orgSlug: string, shipmentId: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const full = await loadShipmentFull(db, ctx.org.id, shipmentId);
  if (full.lines.some((l) => !full.decisionByLine.get(l.id)?.humanConfirmed)) throw new Error("unconfirmed HS");
  await db.update(schema.shipments).set({ status: "calculating" }).where(and(eq(schema.shipments.id, shipmentId), inArray(schema.shipments.status, ["classifying", "review_lines"])));
  redirect(`${base(ctx, shipmentId)}/calc`);
}

/* ------------------------------------------------------------------ */
/* Calculation & FX                                                    */
/* ------------------------------------------------------------------ */
export async function calculateAction(orgSlug: string, shipmentId: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const r = await runAndStoreCalculation(db, { orgId: ctx.org.id, userId: ctx.user.id }, shipmentId);
  if (!r.ok) {
    const q = new URLSearchParams({ err: r.reason, ...(r.detail ?? {}) });
    redirect(`${base(ctx, shipmentId)}/calc?${q}`);
  }
  revalidatePath(`${base(ctx, shipmentId)}/calc`);
  redirect(`${base(ctx, shipmentId)}/calc`);
}

export async function setRegistrationDateAction(orgSlug: string, shipmentId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const full = await loadShipmentFull(db, ctx.org.id, shipmentId);
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(formData.get("declarationRegistrationDate"));
  await db.update(schema.shipments).set({ declarationRegistrationDate: date }).where(eq(schema.shipments.id, shipmentId));
  await log(ctx, "shipments", shipmentId, "set_registration_date", { date: full.shipment.declarationRegistrationDate }, { date });
  return calculateAction(orgSlug, shipmentId);
}

export async function fetchNbgAction(orgSlug: string, shipmentId: string, date: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  try {
    const r = await syncNbgRates(db, date);
    await log(ctx, "fx_rates", date, "nbg_fetch", null, r);
  } catch (e) {
    redirect(`${base(ctx, shipmentId)}/calc?err=nbg_failed&msg=${encodeURIComponent((e as Error).message)}`);
  }
  return calculateAction(orgSlug, shipmentId);
}

export async function manualRateAction(orgSlug: string, shipmentId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const p = z.object({ currency: str(3).min(3), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), rateGel: dec, note: str(200).min(2) }).parse({ currency: formData.get("currency"), date: formData.get("date"), rateGel: formData.get("rateGel"), note: formData.get("note") });
  const id = await setManualRate(db, { currency: p.currency, date: p.date, rateGel: new Decimal(p.rateGel).toFixed(6), note: p.note });
  await log(ctx, "fx_rates", id, "manual_rate", null, p);
  return calculateAction(orgSlug, shipmentId);
}

/* ------------------------------------------------------------------ */
/* Approval & export                                                   */
/* ------------------------------------------------------------------ */
export async function approveAction(orgSlug: string, shipmentId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  if (formData.get("attest") !== "on") throw new Error("attestation required");
  const full = await loadShipmentFull(db, ctx.org.id, shipmentId);
  if (!full.calculation) throw new Error("no calculation");
  if (full.lines.some((l) => !full.decisionByLine.get(l.id)?.humanConfirmed)) throw new Error("unconfirmed HS");
  if (!full.calculation.tariffVersionId || !full.calculation.fxDate || !full.calculation.feeScheduleEffectiveFrom) throw new Error("missing versions");
  await db.update(schema.calculations).set({ approved: true, approvedBy: ctx.user.id, approvedAt: new Date() }).where(eq(schema.calculations.id, full.calculation.id));
  await db.update(schema.shipments).set({ status: "approved" }).where(eq(schema.shipments.id, shipmentId));
  await log(ctx, "calculations", full.calculation.id, "approve", { approved: false }, { approved: true, total: full.calculation.totalPayableGel, attest: true });
  redirect(`${base(ctx, shipmentId)}/export`);
}

export async function exportAction(orgSlug: string, shipmentId: string, kind: ExportKind) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  await generateExport(db, { orgId: ctx.org.id, userId: ctx.user.id }, shipmentId, kind);
  revalidatePath(`${base(ctx, shipmentId)}/export`);
}

/* ------------------------------------------------------------------ */
/* Guided flow                                                         */
/* ------------------------------------------------------------------ */
export async function toggleChecklistAction(orgSlug: string, shipmentId: string, checklistId: string, key: string, done: boolean) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const r = await toggleChecklistItem(db, ctx.org.id, checklistId, key, done);
  await log(ctx, "checklists", checklistId, "toggle", { key, before: r.before.find((i) => i.key === key)?.done }, { key, done });
  revalidatePath(`${base(ctx, shipmentId)}`, "layout");
}

export async function setAssessmentAction(orgSlug: string, shipmentId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const full = await loadShipmentFull(db, ctx.org.id, shipmentId);
  const number = str(40).min(1).parse(formData.get("assessmentNumber"));
  await db.update(schema.shipments).set({ assessmentNumber: number, status: "assessed" }).where(eq(schema.shipments.id, shipmentId));
  await log(ctx, "shipments", shipmentId, "assessment_number", { assessmentNumber: full.shipment.assessmentNumber }, { assessmentNumber: number });
  redirect(`${base(ctx, shipmentId)}/payment`);
}

export async function markImportedAction(orgSlug: string, shipmentId: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  await ensureChecklist(db, ctx.org.id, shipmentId, "ecustoms_import");
  await db.update(schema.shipments).set({ status: "imported_to_ecustoms" }).where(and(eq(schema.shipments.id, shipmentId), inArray(schema.shipments.status, ["approved", "exported"])));
  await log(ctx, "shipments", shipmentId, "imported_to_ecustoms");
  revalidatePath(`${base(ctx, shipmentId)}/ecustoms`);
}

export async function markPaidAction(orgSlug: string, shipmentId: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  await db.update(schema.shipments).set({ status: "paid" }).where(eq(schema.shipments.id, shipmentId));
  await log(ctx, "shipments", shipmentId, "paid");
  redirect(`${base(ctx, shipmentId)}/corridor`);
}

export async function setCorridorAction(orgSlug: string, shipmentId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const p = z.object({ corridor: z.enum(["green", "blue", "yellow", "red"]), redReason: z.enum(["physical", "value", "documents", "unknown"]).optional() }).parse({ corridor: formData.get("corridor"), redReason: formData.get("redReason") || undefined });
  const full = await loadShipmentFull(db, ctx.org.id, shipmentId);
  await db.update(schema.shipments).set({ corridor: p.corridor, redReason: p.corridor === "red" ? (p.redReason ?? "unknown") : null, status: `corridor_${p.corridor}` as never }).where(eq(schema.shipments.id, shipmentId));
  if (p.corridor === "yellow") await ensureChecklist(db, ctx.org.id, shipmentId, "yellow_corridor");
  if (p.corridor === "red" && p.redReason === "physical") await ensureChecklist(db, ctx.org.id, shipmentId, "red_corridor_physical");
  if (p.corridor === "red" && p.redReason === "value") await ensureChecklist(db, ctx.org.id, shipmentId, "red_corridor_value");
  await log(ctx, "shipments", shipmentId, "corridor", { corridor: full.shipment.corridor }, p);
  revalidatePath(`${base(ctx, shipmentId)}/corridor`);
}

export async function rsAdjustedAction(orgSlug: string, shipmentId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const full = await loadShipmentFull(db, ctx.org.id, shipmentId);
  const value = dec.parse(formData.get("rsAdjustedValueGel"));
  await db.update(schema.shipments).set({ rsAdjustedValueGel: new Decimal(value).toFixed(2) }).where(eq(schema.shipments.id, shipmentId));
  await log(ctx, "shipments", shipmentId, "rs_value_adjusted", { customsValue: full.calculation?.customsValueGel }, { rsAdjustedValueGel: value });
  revalidatePath(`${base(ctx, shipmentId)}/corridor`);
}

export async function markReleasedAction(orgSlug: string, shipmentId: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  await db.update(schema.shipments).set({ status: "released", releasedAt: new Date() }).where(eq(schema.shipments.id, shipmentId));
  await db.insert(schema.trackingEvents).values({ organizationId: ctx.org.id, shipmentId, kind: "released" });
  await log(ctx, "shipments", shipmentId, "released");
  revalidatePath(`${base(ctx, shipmentId)}/close`);
}

/** Close: persist outcome to own price history (value-risk base). RS-adjusted value replaces declared value. */
export async function closeShipmentAction(orgSlug: string, shipmentId: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  const full = await loadShipmentFull(db, ctx.org.id, shipmentId);
  const calc = full.calculation;
  if (calc) {
    const declaredTotal = new Decimal(calc.customsValueGel);
    const factor = full.shipment.rsAdjustedValueGel && declaredTotal.gt(0) ? new Decimal(full.shipment.rsAdjustedValueGel).div(declaredTotal) : new Decimal(1);
    for (const b of calc.breakdown) {
      const line = full.lines.find((l) => l.id === b.line_id);
      if (!line) continue;
      const cv = new Decimal(b.customs_value_gel).mul(factor);
      const kg = new Decimal(line.netWeightKg ?? 0);
      const qty = new Decimal(line.quantity);
      const basis = kg.gt(0) ? "per_kg" : qty.gt(0) ? "per_unit" : null;
      if (!basis) continue;
      await db.insert(schema.priceReferences).values({ organizationId: ctx.org.id, hsCode: b.hs_code, originCountry: line.originCountry ?? full.shipment.originCountry, unitBasis: basis, unitPriceGel: cv.div(basis === "per_kg" ? kg : qty).toFixed(4), observedAt: full.shipment.declarationRegistrationDate ?? todayIso(), source: "own_history", shipmentId, note: full.shipment.rsAdjustedValueGel ? "rs_adjusted" : null });
    }
  }
  await db.update(schema.shipments).set({ status: "closed", closedAt: new Date() }).where(eq(schema.shipments.id, shipmentId));
  await log(ctx, "shipments", shipmentId, "closed", null, { corridor: full.shipment.corridor, rsAdjusted: full.shipment.rsAdjustedValueGel });
  revalidatePath(`${base(ctx, shipmentId)}/close`);
}

export async function cancelShipmentAction(orgSlug: string, shipmentId: string) {
  const ctx = await requireOrg(orgSlug, ["owner", "member"]);
  const db = await getDb();
  await db.update(schema.shipments).set({ status: "cancelled" }).where(and(eq(schema.shipments.organizationId, ctx.org.id), eq(schema.shipments.id, shipmentId)));
  await log(ctx, "shipments", shipmentId, "cancelled");
  redirect(`/${ctx.org.slug}/dashboard`);
}
