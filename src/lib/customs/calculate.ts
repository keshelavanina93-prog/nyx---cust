/**
 * Pure calculation orchestrator: customs value → duties → fees → broker comparison → penalty → value risk.
 * No DB access here; `src/lib/customs/run.ts` loads inputs and persists the result.
 */
import Decimal from "decimal.js";
import { D, roundMoney, sum, type RoundingMode } from "@/lib/money";
import { computeCustomsValue, type ValueLineInput } from "./value";
import { computeLineDuties, type DutyTariff } from "./duties";
import { computeAllFees, computeFee, type FeeMode, type FeeScheduleRow } from "./fees";
import { isOffHours, type HolidayRow, type WorkingHoursRow } from "./working-hours";
import { penaltyExposure, selectPenaltyRule, type PenaltyRuleRow } from "./penalty";
import { assessValueRisk, maxRiskLevel, type PriceReferenceRow, type ValueRiskConfig, DEFAULT_VALUE_RISK_CONFIG } from "./value-risk";
import { makeFxConverter, type FxRateRow } from "./fx";
import type { CalcLineBreakdown, FeeAlternative, ValueRisk } from "@/db/schema";

export type CalcLine = ValueLineInput & {
  description: string;
  originCountry: string | null;
  hsCode: string;
  tariff: DutyTariff;
  /** Other candidates' tariffs (for penalty exposure: highest-burden alternative). */
  candidateTariffs: DutyTariff[];
};

export type CalcInput = {
  incoterm: string | null;
  mode: FeeMode;
  lines: CalcLine[];
  freightAmount: string | null;
  freightCurrency: string | null;
  insuranceAmount: string | null;
  insuranceCurrency: string | null;
  otherCosts: { label: string; amount: string; currency: string; included: boolean }[];
  allocationBasis: "value" | "weight";
  fxRates: FxRateRow[];
  fxDate: string;
  feeRows: FeeScheduleRow[];
  workingHours: WorkingHoursRow[];
  holidays: HolidayRow[];
  officeCode: string | null;
  lodgedAt: Date;
  penaltyRules: PenaltyRuleRow[];
  isNaturalPerson: boolean;
  isRepeatOffence: boolean;
  priceReferences: PriceReferenceRow[];
  today: Date;
  vatRate: string;
  vatIncludesExcise: boolean;
  rounding: RoundingMode;
  brokerCostPerHsGel: string;
  valueRiskConfig?: ValueRiskConfig;
  tz?: string;
};

export type CalcLineOutput = CalcLineBreakdown & { penalty_exposure_gel: string; value_risk: ValueRisk };

export type CalcOutput = {
  customsValueGel: string;
  dutyTotal: string;
  exciseTotal: string;
  vatTotal: string;
  feeGel: string;
  feeMode: FeeMode;
  feeOffHours: boolean;
  feeAlternatives: FeeAlternative[];
  brokerCostComparisonGel: string;
  penaltyExposureTotalGel: string;
  valueRiskLevel: "none" | "low" | "medium" | "high";
  totalPayableGel: string;
  lines: CalcLineOutput[];
  fxRate: string;
  fxCurrency: string;
  fxDate: string;
  fxSource: string;
  assumptions: string[];
};

export function runCalculation(input: CalcInput): CalcOutput {
  const fx = makeFxConverter(input.fxRates);
  const value = computeCustomsValue(
    {
      incoterm: input.incoterm,
      lines: input.lines,
      freightAmount: input.freightAmount,
      freightCurrency: input.freightCurrency,
      insuranceAmount: input.insuranceAmount,
      insuranceCurrency: input.insuranceCurrency,
      otherCosts: input.otherCosts,
      allocationBasis: input.allocationBasis,
      rounding: input.rounding,
    },
    (a, c) => fx.convert(a, c),
  );

  const assumptions = [...value.assumptions];
  if (input.vatIncludesExcise) assumptions.push("vat_base_includes_excise:unverified");
  assumptions.push(`rounding:${input.rounding}:unverified`);

  const { offHours, reason } = isOffHours(input.lodgedAt, input.officeCode, input.workingHours, input.holidays, input.tz);
  const feeAlternatives = computeAllFees(input.feeRows, value.customsValueGel, offHours);
  const fee = computeFee(input.feeRows, input.mode, value.customsValueGel, offHours);
  if (fee.needs_reverification) assumptions.push("fee_schedule:needs_reverification_decree96");
  if (offHours) assumptions.push(`off_hours:${reason}`);

  const penaltyRule = selectPenaltyRule(input.penaltyRules, { isNaturalPerson: input.isNaturalPerson, isRepeat: input.isRepeatOffence, customsValueGel: value.customsValueGel });

  const dutyCfg = { vatRate: input.vatRate, vatIncludesExcise: input.vatIncludesExcise, rounding: input.rounding };
  const lines: CalcLineOutput[] = input.lines.map((l) => {
    const v = value.lines.find((x) => x.id === l.id)!;
    const duties = computeLineDuties({ id: l.id, customsValueGel: v.customsValueGel, quantity: l.quantity, netWeightKg: l.netWeightKg, tariff: l.tariff }, dutyCfg);
    const selectedBurden = duties.dutyGel.plus(duties.vatGel).plus(duties.exciseGel);
    const altBurdens = l.candidateTariffs
      .filter((t) => t.hsCode !== l.hsCode)
      .map((t) => {
        const d = computeLineDuties({ id: l.id, customsValueGel: v.customsValueGel, quantity: l.quantity, netWeightKg: l.netWeightKg, tariff: t }, dutyCfg);
        return d.dutyGel.plus(d.vatGel).plus(d.exciseGel);
      });
    const pen = penaltyExposure(selectedBurden, altBurdens, penaltyRule);
    const risk = assessValueRisk(
      { hsCode: l.hsCode, originCountry: l.originCountry, customsValueGel: v.customsValueGel, quantity: l.quantity, netWeightKg: l.netWeightKg ?? null },
      input.priceReferences,
      input.today,
      input.valueRiskConfig ?? DEFAULT_VALUE_RISK_CONFIG,
    );
    return {
      line_id: l.id,
      line_no: l.lineNo,
      hs_code: l.hsCode,
      description: l.description,
      invoice_value: v.invoiceValue.toFixed(2),
      invoice_value_gel: v.invoiceValueGel.toFixed(2),
      freight_alloc_gel: v.freightAllocGel.toFixed(2),
      insurance_alloc_gel: v.insuranceAllocGel.toFixed(2),
      other_alloc_gel: v.otherAllocGel.minus(v.deductionAllocGel).toFixed(2),
      customs_value_gel: v.customsValueGel.toFixed(2),
      duty_rate: l.tariff.dutyRate,
      duty_gel: duties.dutyGel.toFixed(2),
      excise_gel: duties.exciseGel.toFixed(2),
      vat_base_gel: duties.vatBaseGel.toFixed(2),
      vat_gel: duties.vatGel.toFixed(2),
      total_gel: duties.totalGel.toFixed(2),
      formulas: { ...v.formulas, ...duties.formulas, penalty: `max(0, ${pen.shortfallGel.toFixed(2)}) × ${pen.percent}% (მ.167, ინდიკატორი)` },
      penalty_exposure_gel: pen.exposureGel.toFixed(2),
      value_risk: risk,
    };
  });

  const dutyTotal = sum(lines.map((l) => l.duty_gel));
  const exciseTotal = sum(lines.map((l) => l.excise_gel));
  const vatTotal = sum(lines.map((l) => l.vat_gel));
  const uniqueHs = new Set(lines.map((l) => l.hs_code)).size;
  const brokerCost = roundMoney(D(input.brokerCostPerHsGel).mul(uniqueHs), input.rounding);
  const penaltyTotal = sum(lines.map((l) => l.penalty_exposure_gel));
  const totalPayable = dutyTotal.plus(exciseTotal).plus(vatTotal).plus(fee.fee_gel);

  const mainCurrency = input.lines[0]?.currency ?? "GEL";
  const fxRow = fx.get(mainCurrency);

  return {
    customsValueGel: value.customsValueGel.toFixed(2),
    dutyTotal: dutyTotal.toFixed(2),
    exciseTotal: exciseTotal.toFixed(2),
    vatTotal: vatTotal.toFixed(2),
    feeGel: fee.fee_gel,
    feeMode: input.mode,
    feeOffHours: fee.off_hours_applied,
    feeAlternatives,
    brokerCostComparisonGel: brokerCost.toFixed(2),
    penaltyExposureTotalGel: penaltyTotal.toFixed(2),
    valueRiskLevel: maxRiskLevel(lines.map((l) => l.value_risk.level)),
    totalPayableGel: totalPayable.toFixed(2),
    lines,
    fxRate: fxRow ? new Decimal(fxRow.rateGel).div(fxRow.quantity).toFixed(6) : "1.000000",
    fxCurrency: mainCurrency.toUpperCase(),
    fxDate: input.fxDate,
    fxSource: fxRow?.source ?? "n/a",
    assumptions: Array.from(new Set(assumptions)),
  };
}
