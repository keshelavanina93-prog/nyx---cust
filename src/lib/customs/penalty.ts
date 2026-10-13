/**
 * Penalty exposure indicator [VERIFIED: Customs Code art.167].
 * Underpayment caused by incorrect data: 100% of the shortfall, 200% on repeat;
 * natural person with ≤3 000 ₾: 40% / 100%.
 * This is an INDICATOR, not legal advice (UI must say so).
 */
import Decimal from "decimal.js";
import { D, roundMoney } from "@/lib/money";

export type PenaltyRuleRow = { rule: string; percent: string; thresholdGel: string | null };

export type PenaltyContext = {
  isNaturalPerson: boolean;
  isRepeat: boolean;
  customsValueGel: Decimal.Value;
};

export function selectPenaltyRule(rules: PenaltyRuleRow[], ctx: PenaltyContext): PenaltyRuleRow {
  const small = rules.find((r) => r.rule.startsWith("natural_person_small"));
  const threshold = small?.thresholdGel ? D(small.thresholdGel) : D(3000);
  const key =
    ctx.isNaturalPerson && D(ctx.customsValueGel).lte(threshold)
      ? ctx.isRepeat
        ? "natural_person_small_repeat"
        : "natural_person_small_first"
      : ctx.isRepeat
        ? "underpaid_repeat"
        : "underpaid_first";
  const rule = rules.find((r) => r.rule === key);
  if (!rule) throw new Error(`penalty rule ${key} not configured`);
  return rule;
}

/**
 * exposure = max(0, burden(candidate with highest duty+VAT) − burden(selected)) × percent
 */
export function penaltyExposure(
  selectedBurdenGel: Decimal.Value,
  candidateBurdensGel: Decimal.Value[],
  rule: PenaltyRuleRow,
): { exposureGel: Decimal; shortfallGel: Decimal; percent: string } {
  const maxBurden = candidateBurdensGel.reduce<Decimal>((m, b) => Decimal.max(m, D(b)), D(selectedBurdenGel));
  const shortfall = Decimal.max(0, maxBurden.minus(selectedBurdenGel));
  return { exposureGel: roundMoney(shortfall.mul(D(rule.percent)).div(100)), shortfallGel: roundMoney(shortfall), percent: rule.percent };
}
