/**
 * Load inputs from the DB, run the pure calculation, persist a new `calculations` version,
 * update per-line penalty/value-risk, create the red_corridor_value checklist when needed.
 */
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { runCalculation, type CalcLine } from "./calculate";
import { getRatesForDate, syncNbgRates } from "./fx-db";
import type { FeeMode } from "./fees";
import { loadShipmentFull, loadSettings, loadActiveTariff, loadReferenceData, loadPriceReferences } from "@/lib/shipments/queries";
import { ensureChecklist } from "@/lib/shipments/checklists";
import { audit } from "@/lib/audit/log";
import { todayIso } from "@/lib/utils";
import type { DutyTariff } from "./duties";

export type RunResult = { ok: true; calculationId: string } | { ok: false; reason: "unconfirmed_hs" | "fx_missing" | "no_tariff" | "no_lines"; detail?: Record<string, string> };

export async function runAndStoreCalculation(db: Db, ctx: { orgId: string; userId: string }, shipmentId: string, lodgedAt = new Date()): Promise<RunResult> {
  const full = await loadShipmentFull(db, ctx.orgId, shipmentId);
  if (full.lines.length === 0) return { ok: false, reason: "no_lines" };
  const unconfirmed = full.lines.filter((l) => !full.decisionByLine.get(l.id)?.humanConfirmed || !full.decisionByLine.get(l.id)?.finalHsCode);
  if (unconfirmed.length) return { ok: false, reason: "unconfirmed_hs", detail: { n: String(unconfirmed.length) } };
  const tariff = await loadActiveTariff(db);
  if (!tariff) return { ok: false, reason: "no_tariff" };
  const settings = await loadSettings(db);
  const ref = await loadReferenceData(db);
  const org = (await db.query.organizations.findFirst({ where: eq(schema.organizations.id, ctx.orgId) }))!;

  // FX: rate of the registration day (art.8). Default registration date = today.
  const fxDate = full.shipment.declarationRegistrationDate ?? todayIso();
  if (!full.shipment.declarationRegistrationDate) await db.update(schema.shipments).set({ declarationRegistrationDate: fxDate }).where(eq(schema.shipments.id, shipmentId));
  const currencies = new Set<string>([full.shipment.currency, full.shipment.freightCurrency, full.shipment.insuranceCurrency, ...full.lines.map((l) => l.currency), ...full.shipment.otherCosts.map((c) => c.currency)].filter((c): c is string => !!c && c.toUpperCase() !== "GEL").map((c) => c.toUpperCase()));
  let rates = await getRatesForDate(db, fxDate);
  const missing = () => [...currencies].filter((c) => !rates.some((r) => r.currency === c));
  if (missing().length && process.env.NBG_RATES_URL) {
    try {
      await syncNbgRates(db, fxDate);
      rates = await getRatesForDate(db, fxDate);
    } catch (e) {
      await audit({ organizationId: ctx.orgId, actorType: "system", entity: "fx_rates", entityId: fxDate, action: "nbg_fetch_failed", after: { error: (e as Error).message } }, db);
    }
  }
  if (missing().length) return { ok: false, reason: "fx_missing", detail: { currency: missing()[0]!, date: fxDate } };

  // Tariff lines for selected + candidate codes
  const codes = new Set<string>();
  for (const l of full.lines) {
    const d = full.decisionByLine.get(l.id)!;
    codes.add(d.finalHsCode!);
    d.candidates.forEach((c) => codes.add(c.hs_code));
  }
  const tlRows = codes.size ? await db.select().from(schema.tariffLines).where(and(eq(schema.tariffLines.tariffVersionId, tariff.id), inArray(schema.tariffLines.hsCode, [...codes]))) : [];
  const tariffByCode = new Map(tlRows.map((t) => [t.hsCode, t]));
  const toDuty = (code: string): DutyTariff | null => {
    const t = tariffByCode.get(code);
    return t ? { hsCode: t.hsCode, dutyRate: t.dutyRate, dutySpecific: t.dutySpecific, exciseRate: t.exciseRate, exciseSpecific: t.exciseSpecific, vatExempt: t.vatExempt } : null;
  };

  const lines: CalcLine[] = full.lines.map((l) => {
    const d = full.decisionByLine.get(l.id)!;
    const selected = toDuty(d.finalHsCode!);
    if (!selected) throw new Error(`HS ${d.finalHsCode} not in active tariff`);
    return {
      id: l.id,
      lineNo: l.lineNo,
      lineTotal: l.lineTotal,
      currency: l.currency,
      netWeightKg: l.netWeightKg,
      quantity: l.quantity,
      description: l.descriptionNormalizedKa ?? l.descriptionRaw,
      originCountry: l.originCountry ?? full.shipment.originCountry,
      hsCode: d.finalHsCode!,
      tariff: selected,
      candidateTariffs: d.candidates.map((c) => toDuty(c.hs_code)).filter((x): x is DutyTariff => !!x),
    };
  });

  const since = new Date(Date.now() - settings.valueRisk.windowDays * 86_400_000).toISOString().slice(0, 10);
  const priceRefs = await loadPriceReferences(db, ctx.orgId, lines.map((l) => l.hsCode), since);
  const repeat = false; // [ASSUMPTION] repeat offence flag could be an org setting later

  const out = runCalculation({
    incoterm: full.shipment.incoterm,
    mode: full.shipment.mode as FeeMode,
    lines,
    freightAmount: full.shipment.freightAmount,
    freightCurrency: full.shipment.freightCurrency,
    insuranceAmount: full.shipment.insuranceAmount,
    insuranceCurrency: full.shipment.insuranceCurrency,
    otherCosts: full.shipment.otherCosts,
    allocationBasis: full.shipment.allocationBasis,
    fxRates: rates,
    fxDate,
    feeRows: ref.fees.map((f) => ({ mode: f.mode, valueMin: f.valueMin, valueMax: f.valueMax, feeGel: f.feeGel, doublesOffHours: f.doublesOffHours, legalRef: f.legalRef, needsReverification: f.needsReverification, effectiveFrom: f.effectiveFrom })),
    workingHours: ref.workingHours.map((w) => ({ officeCode: w.officeCode, weekday: w.weekday, opensAt: w.opensAt, closesAt: w.closesAt })),
    holidays: ref.holidays.map((h) => ({ date: h.date })),
    officeCode: full.shipment.destinationOffice,
    lodgedAt,
    penaltyRules: ref.penaltyRules.map((p) => ({ rule: p.rule, percent: p.percent, thresholdGel: p.thresholdGel })),
    isNaturalPerson: org.isNaturalPerson,
    isRepeatOffence: repeat,
    priceReferences: priceRefs.map((p) => ({ hsCode: p.hsCode, originCountry: p.originCountry, unitBasis: p.unitBasis, unitPriceGel: p.unitPriceGel, observedAt: p.observedAt })),
    today: new Date(),
    vatRate: ref.countryProfile?.vatRate ?? "18",
    vatIncludesExcise: settings.vatIncludesExcise,
    rounding: settings.rounding,
    brokerCostPerHsGel: org.brokerCostPerHsGel,
    valueRiskConfig: settings.valueRisk,
  });

  const mainRate = rates.find((r) => r.currency === out.fxCurrency);
  const version = (full.calculation?.version ?? 0) + 1;
  const [calc] = await db
    .insert(schema.calculations)
    .values({
      organizationId: ctx.orgId,
      shipmentId,
      version,
      customsValueGel: out.customsValueGel,
      breakdown: out.lines.map(({ penalty_exposure_gel: _p, value_risk: _v, ...rest }) => rest),
      dutyTotal: out.dutyTotal,
      exciseTotal: out.exciseTotal,
      vatTotal: out.vatTotal,
      feeGel: out.feeGel,
      feeMode: out.feeMode,
      feeOffHours: out.feeOffHours,
      feeAlternatives: out.feeAlternatives,
      brokerCostComparisonGel: out.brokerCostComparisonGel,
      penaltyExposureTotalGel: out.penaltyExposureTotalGel,
      valueRiskLevel: out.valueRiskLevel,
      totalPayableGel: out.totalPayableGel,
      fxRate: out.fxRate,
      fxCurrency: out.fxCurrency,
      fxDate: out.fxDate,
      fxSource: out.fxSource,
      vatRate: ref.countryProfile?.vatRate ?? "18",
      tariffVersionId: tariff.id,
      feeScheduleEffectiveFrom: ref.fees[0]?.effectiveFrom ?? "1970-01-01",
      fxRateId: mainRate?.id ?? null,
      assumptions: out.assumptions,
    })
    .returning();

  for (const l of out.lines) {
    await db
      .update(schema.hsDecisions)
      .set({ penaltyExposureGel: l.penalty_exposure_gel, valueRisk: l.value_risk, tariffVersionId: tariff.id })
      .where(and(eq(schema.hsDecisions.organizationId, ctx.orgId), eq(schema.hsDecisions.invoiceLineId, l.line_id)));
  }
  if (out.valueRiskLevel === "medium" || out.valueRiskLevel === "high") await ensureChecklist(db, ctx.orgId, shipmentId, "red_corridor_value");
  await ensureChecklist(db, ctx.orgId, shipmentId, "documents");
  await db.update(schema.shipments).set({ status: "awaiting_approval", fxRateId: mainRate?.id ?? null }).where(eq(schema.shipments.id, shipmentId));
  await audit({ organizationId: ctx.orgId, actorType: "user", actorId: ctx.userId, entity: "calculations", entityId: calc!.id, action: "calculate", after: { version, total: out.totalPayableGel, fxDate, valueRisk: out.valueRiskLevel } }, db);
  return { ok: true, calculationId: calc!.id };
}
