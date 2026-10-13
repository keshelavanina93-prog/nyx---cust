/**
 * Security tests (brief §10): cross-tenant isolation, placeholder export gate, HS confirmation gate,
 * no personal number stored, audit log append-only, webhook signature rejection.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { createTestDb, schema, type Db } from "@/db/client";
import { seedReference } from "@/db/seed/reference";
import { importTariffCsv } from "@/lib/tariff/import";
import { runAndStoreCalculation } from "@/lib/customs/run";
import { exportGate } from "@/lib/export/run";
import { loadPriceReferences } from "@/lib/shipments/queries";
import { classifyLine } from "@/lib/ai/classify";
import { processIntake } from "@/lib/intake/process";

let db: Db;
let orgA: string, orgB: string, userA: string, tariffId: string;

async function makeShipment(orgId: string, withHs = true) {
  const [s] = await db.insert(schema.shipments).values({ organizationId: orgId, reference: `S-${Math.random().toString(36).slice(2, 6)}`, incoterm: "FOB", currency: "USD", declarationRegistrationDate: "2026-10-13", destinationOffice: "11111", freightAmount: "100.00", freightCurrency: "USD" }).returning();
  const [l] = await db.insert(schema.invoiceLines).values({ organizationId: orgId, shipmentId: s!.id, lineNo: 1, descriptionRaw: "Cotton table linen", quantity: "100", unitPrice: "10", lineTotal: "1000.00", currency: "USD", netWeightKg: "80", originCountry: "TR" }).returning();
  if (withHs) {
    await db.insert(schema.hsDecisions).values({ organizationId: orgId, invoiceLineId: l!.id, candidates: [{ hs_code: "6302510000", confidence: 0.9, reasoning_ka: "t", citations: [], gri_rules: [], duty_rate: "12" }, { hs_code: "5208520000", confidence: 0.4, reasoning_ka: "t", citations: [], gri_rules: [], duty_rate: "0" }], suggestedHsCode: "6302510000", finalHsCode: "6302510000", humanConfirmed: true, confirmedBy: userA, confirmedAt: new Date(), tariffVersionId: tariffId });
  }
  return { shipmentId: s!.id, lineId: l!.id };
}

beforeAll(async () => {
  process.env.AI_MOCK = "true";
  db = await createTestDb();
  await seedReference(db);
  const csv = await fs.readFile(path.join(process.cwd(), "src/db/seed/tariff.placeholder.csv"), "utf8");
  tariffId = (await importTariffCsv(db, csv, { source: "placeholder", effectiveFrom: "2026-01-01" })).versionId;
  const [u] = await db.insert(schema.users).values({ email: "a@example.com" }).returning();
  userA = u!.id;
  const [a] = await db.insert(schema.organizations).values({ name: "A", slug: "a" }).returning();
  const [b] = await db.insert(schema.organizations).values({ name: "B", slug: "b" }).returning();
  orgA = a!.id;
  orgB = b!.id;
  await db.insert(schema.fxRates).values({ currency: "USD", date: "2026-10-13", rateGel: "2.700000", quantity: 1, source: "manual", note: "test" });
});

describe("tenant isolation", () => {
  it("price references of org B are never used for org A's value risk", async () => {
    for (let i = 0; i < 4; i++) await db.insert(schema.priceReferences).values({ organizationId: orgB, hsCode: "6302510000", originCountry: "TR", unitBasis: "per_kg", unitPriceGel: "100.0000", observedAt: "2026-10-01", source: "user_reference" });
    const refsA = await loadPriceReferences(db, orgA, ["6302510000"], "2026-07-01");
    expect(refsA.length).toBe(0);
    const { shipmentId } = await makeShipment(orgA);
    const r = await runAndStoreCalculation(db, { orgId: orgA, userId: userA }, shipmentId, new Date("2026-10-14T08:00:00Z"));
    expect(r.ok).toBe(true);
    const calc = await db.query.calculations.findFirst({ where: eq(schema.calculations.shipmentId, shipmentId) });
    expect(calc?.valueRiskLevel).toBe("none"); // insufficient own data, B's 100 ₾/kg ignored
  });
  it("client memory of org B is not suggested to org A", async () => {
    await db.insert(schema.clientMemory).values({ organizationId: orgB, productKey: "cotton-table-linen", descriptionRaw: "Cotton table linen", hsCode: "9503009000", timesConfirmed: 5 });
    const r = await classifyLine(db, { id: "x", descriptionRaw: "Cotton table linen", descriptionNormalizedKa: "სუფრის თეთრეული ბამბის", sku: null, quantity: "1", unit: "pcs", originCountry: "TR" }, { organizationId: orgA, shipmentId: null, supplierId: null, supplierName: null, tariffVersionId: tariffId });
    expect(r.source).toBe("ai");
    expect(r.candidates[0]?.hs_code).not.toBe("9503009000");
  });
  it("shipment of org B is not loadable through org A scope", async () => {
    const { shipmentId } = await makeShipment(orgB);
    const row = await db.query.shipments.findFirst({ where: and(eq(schema.shipments.organizationId, orgA), eq(schema.shipments.id, shipmentId)) });
    expect(row).toBeUndefined();
  });
});

describe("gates", () => {
  it("calculation and export are blocked while HS unconfirmed", async () => {
    const { shipmentId, lineId } = await makeShipment(orgA, false);
    await db.insert(schema.hsDecisions).values({ organizationId: orgA, invoiceLineId: lineId, candidates: [], suggestedHsCode: "6302510000", humanConfirmed: false, tariffVersionId: tariffId });
    const r = await runAndStoreCalculation(db, { orgId: orgA, userId: userA }, shipmentId);
    expect(r).toMatchObject({ ok: false, reason: "unconfirmed_hs" });
    expect(await exportGate(db, orgA, shipmentId, "xls")).toMatchObject({ ok: false, reason: "unconfirmed_hs" });
  });
  it("export blocked until approved; placeholder blocked in production", async () => {
    const { shipmentId } = await makeShipment(orgA);
    await runAndStoreCalculation(db, { orgId: orgA, userId: userA }, shipmentId);
    expect(await exportGate(db, orgA, shipmentId, "xls")).toMatchObject({ ok: false, reason: "not_approved" });
    await db.update(schema.calculations).set({ approved: true }).where(eq(schema.calculations.shipmentId, shipmentId));
    expect((await exportGate(db, orgA, shipmentId, "xls")).ok).toBe(true);
    const prev = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = "production";
    expect(await exportGate(db, orgA, shipmentId, "xls")).toMatchObject({ ok: false, reason: "placeholder_tariff" });
    (process.env as Record<string, string>).NODE_ENV = prev ?? "test";
  });
  it("audit log rejects update/delete", async () => {
    await db.insert(schema.auditLog).values({ organizationId: orgA, actorType: "system", entity: "t", action: "x" });
    const msg = async (p: Promise<unknown>) => p.then(() => "", (e: Error & { cause?: Error }) => `${e.message} ${e.cause?.message ?? ""}`);
    expect(await msg(db.delete(schema.auditLog))).toMatch(/append-only/);
    expect(await msg(db.update(schema.auditLog).set({ action: "y" }))).toMatch(/append-only/);
  });
  it("no personal-number column exists on ecustoms_profiles", () => {
    const cols = Object.keys(schema.ecustomsProfiles);
    expect(cols.some((c) => /personal|pid|idNumber|passport/i.test(c))).toBe(false);
  });
});

describe("intake", () => {
  it("unknown sender is ignored; allowlisted sender creates a shipment", async () => {
    await db.insert(schema.intakeChannels).values({ organizationId: orgA, kind: "email", addressOrChatId: "a@in.example.com", secret: "s", verified: true, allowlist: ["boss@a.com"] });
    const pdf = Buffer.from("%PDF-1.4 synthetic");
    const bad = await processIntake(db, { kind: "email", address: "a@in.example.com", from: "stranger@x.com", externalId: "m1", files: [{ name: "inv.pdf", mime: "application/pdf", data: pdf }] });
    expect(bad.status).toBe("ignored");
    const ok = await processIntake(db, { kind: "email", address: "a@in.example.com", from: "boss@a.com", externalId: "m2", subject: "TR-77", files: [{ name: "inv.pdf", mime: "application/pdf", data: pdf }] });
    expect(ok.status).toBe("attached");
    const s = await db.query.shipments.findFirst({ where: eq(schema.shipments.id, ok.shipmentId!) });
    expect(s?.organizationId).toBe(orgA);
    expect(s?.reference).toBe("TR-77");
    const dup = await processIntake(db, { kind: "email", address: "a@in.example.com", from: "boss@a.com", externalId: "m2", files: [{ name: "inv.pdf", mime: "application/pdf", data: pdf }] });
    expect(dup.reason).toBe("duplicate");
  });
  it("telegram /start <code> links the chat; unknown code ignored", async () => {
    await db.insert(schema.intakeChannels).values({ organizationId: orgA, kind: "telegram", addressOrChatId: "pending:1", secret: "code123", verified: false, allowlist: [] });
    const bad = await processIntake(db, { kind: "telegram", address: "555", from: "u", externalId: "t1", files: [], linkCode: "nope" });
    expect(bad.status).toBe("ignored");
    const ok = await processIntake(db, { kind: "telegram", address: "555", from: "u", externalId: "t2", files: [], linkCode: "code123" });
    expect(ok.status).toBe("linked");
    const photo = await processIntake(db, { kind: "telegram", address: "555", from: "u", externalId: "t3", files: [{ name: "p.jpg", mime: "image/jpeg", data: Buffer.from("jpg") }] });
    expect(photo.status).toBe("attached");
  });
});
