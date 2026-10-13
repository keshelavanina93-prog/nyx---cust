/**
 * Customs value (საბაჟო ღირებულება) per line, in GEL.
 * Base: invoice value converted at the NBG official rate of the declaration registration day
 * [VERIFIED, Customs Code art.8]. Freight / insurance / other costs added per incoterm rule and
 * allocated to lines by value (default [ASSUMPTION]) or by net weight.
 */
import Decimal from "decimal.js";
import { D, roundMoney, sum, type RoundingMode } from "@/lib/money";
import { getIncotermRule } from "./incoterms";

export type FxConverter = (amount: Decimal.Value, currency: string) => Decimal;

export type ValueLineInput = {
  id: string;
  lineNo: number;
  lineTotal: string;
  currency: string;
  netWeightKg?: string | null;
  quantity: string;
};

export type ValueInput = {
  incoterm: string | null | undefined;
  lines: ValueLineInput[];
  freightAmount?: string | null;
  freightCurrency?: string | null;
  insuranceAmount?: string | null;
  insuranceCurrency?: string | null;
  otherCosts?: { label: string; amount: string; currency: string; included: boolean }[];
  /** Post-border costs the importer wants to deduct for delivered terms (DAP/DPU/DDP) [UNVERIFIED]. */
  postBorderDeduction?: string | null;
  postBorderDeductionCurrency?: string | null;
  allocationBasis?: "value" | "weight";
  rounding?: RoundingMode;
};

export type ValueLineResult = {
  id: string;
  lineNo: number;
  invoiceValue: Decimal;
  invoiceValueGel: Decimal;
  freightAllocGel: Decimal;
  insuranceAllocGel: Decimal;
  otherAllocGel: Decimal;
  deductionAllocGel: Decimal;
  customsValueGel: Decimal;
  share: Decimal;
  formulas: Record<string, string>;
};

export type ValueResult = {
  lines: ValueLineResult[];
  totalInvoiceGel: Decimal;
  freightGel: Decimal;
  insuranceGel: Decimal;
  otherGel: Decimal;
  deductionGel: Decimal;
  customsValueGel: Decimal;
  incotermApplied: string;
  assumptions: string[];
};

export function computeCustomsValue(input: ValueInput, fx: FxConverter): ValueResult {
  const rule = getIncotermRule(input.incoterm);
  const rounding = input.rounding ?? "half_up";
  const basis = input.allocationBasis ?? "value";
  const assumptions: string[] = [];
  if (!rule.verified) assumptions.push(`incoterm:${rule.code}:unverified`);
  if (basis === "value") assumptions.push("allocation:by_value");

  const lineGel = input.lines.map((l) => ({ l, gel: roundMoney(fx(l.lineTotal, l.currency), rounding) }));
  const totalInvoiceGel = sum(lineGel.map((x) => x.gel));

  const freightGel = rule.addFreight && input.freightAmount ? roundMoney(fx(input.freightAmount, input.freightCurrency ?? "GEL"), rounding) : D(0);
  const insuranceGel = rule.addInsurance && input.insuranceAmount ? roundMoney(fx(input.insuranceAmount, input.insuranceCurrency ?? "GEL"), rounding) : D(0);
  const otherGel = sum((input.otherCosts ?? []).filter((c) => c.included).map((c) => roundMoney(fx(c.amount, c.currency), rounding)));
  const deductionGel = rule.mayDeductPostBorder && input.postBorderDeduction ? roundMoney(fx(input.postBorderDeduction, input.postBorderDeductionCurrency ?? "GEL"), rounding) : D(0);
  if (deductionGel.gt(0)) assumptions.push("post_border_deduction:unverified");

  // Allocation shares
  const totalWeight = sum(input.lines.map((l) => D(l.netWeightKg ?? 0)));
  const useWeight = basis === "weight" && totalWeight.gt(0);
  if (basis === "weight" && !useWeight) assumptions.push("allocation:weight_requested_but_missing_fallback_value");

  const shares = lineGel.map(({ l, gel }) => {
    if (useWeight) return totalWeight.isZero() ? D(0) : D(l.netWeightKg ?? 0).div(totalWeight);
    return totalInvoiceGel.isZero() ? D(1).div(Math.max(1, input.lines.length)) : gel.div(totalInvoiceGel);
  });

  // Allocate with remainder correction so Σ allocations == total exactly.
  const allocate = (total: Decimal): Decimal[] => {
    if (total.isZero() || shares.length === 0) return shares.map(() => D(0));
    const parts = shares.map((s) => roundMoney(total.mul(s), rounding));
    const diff = total.minus(sum(parts));
    if (!diff.isZero()) {
      const idx = parts.length - 1;
      parts[idx] = parts[idx]!.plus(diff);
    }
    return parts;
  };
  const freightAlloc = allocate(freightGel);
  const insuranceAlloc = allocate(insuranceGel);
  const otherAlloc = allocate(otherGel);
  const deductionAlloc = allocate(deductionGel);

  const lines: ValueLineResult[] = lineGel.map(({ l, gel }, i) => {
    const cv = gel.plus(freightAlloc[i]!).plus(insuranceAlloc[i]!).plus(otherAlloc[i]!).minus(deductionAlloc[i]!);
    const share = shares[i]!;
    return {
      id: l.id,
      lineNo: l.lineNo,
      invoiceValue: D(l.lineTotal),
      invoiceValueGel: gel,
      freightAllocGel: freightAlloc[i]!,
      insuranceAllocGel: insuranceAlloc[i]!,
      otherAllocGel: otherAlloc[i]!,
      deductionAllocGel: deductionAlloc[i]!,
      customsValueGel: roundMoney(cv, rounding),
      share,
      formulas: {
        invoice_value_gel: `${l.lineTotal} ${l.currency} × კურსი`,
        share: `${useWeight ? "წონის" : "ღირებულების"} წილი = ${share.toDecimalPlaces(6).toString()}`,
        customs_value_gel: `${gel.toFixed(2)} + ფრახტი ${freightAlloc[i]!.toFixed(2)} + დაზღვევა ${insuranceAlloc[i]!.toFixed(2)} + სხვა ${otherAlloc[i]!.toFixed(2)} − გამოკლება ${deductionAlloc[i]!.toFixed(2)}`,
      },
    };
  });

  const customsValueGel = sum(lines.map((x) => x.customsValueGel));
  return { lines, totalInvoiceGel, freightGel, insuranceGel, otherGel, deductionGel, customsValueGel, incotermApplied: rule.code, assumptions };
}
