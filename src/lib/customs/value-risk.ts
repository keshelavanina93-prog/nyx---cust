/**
 * Customs-value risk indicator (brief §5.5a).
 * RS compares declared prices with its internal database of the same HS over the last 90 days
 * [VERIFIED concept from a real case, legali.ge]. That database is NOT public, so we replicate the
 * concept using ONLY this organization's own history + user-entered reference prices.
 * Never uses other organizations' data (callers must pass org-scoped references only).
 */
import Decimal from "decimal.js";
import { D } from "@/lib/money";
import type { ValueRisk } from "@/db/schema";

export type PriceReferenceRow = {
  hsCode: string;
  originCountry: string | null;
  unitBasis: "per_kg" | "per_unit";
  unitPriceGel: string;
  observedAt: string; // ISO date
};

export type ValueRiskConfig = {
  windowDays: number; // 90
  minSamples: number; // 3
  mediumBelowPct: number; // 20
  highBelowPct: number; // 40
};

export const DEFAULT_VALUE_RISK_CONFIG: ValueRiskConfig = { windowDays: 90, minSamples: 3, mediumBelowPct: 20, highBelowPct: 40 };

function median(values: Decimal[]): Decimal {
  const s = [...values].sort((a, b) => a.cmp(b));
  const n = s.length;
  if (n === 0) return D(0);
  return n % 2 ? s[(n - 1) / 2]! : s[n / 2 - 1]!.plus(s[n / 2]!).div(2);
}

function percentile(values: Decimal[], p: number): Decimal {
  const s = [...values].sort((a, b) => a.cmp(b));
  if (s.length === 0) return D(0);
  const idx = Math.min(s.length - 1, Math.max(0, Math.floor((s.length - 1) * p)));
  return s[idx]!;
}

export function assessValueRisk(
  line: { hsCode: string; originCountry: string | null; customsValueGel: Decimal.Value; quantity: string; netWeightKg: string | null },
  references: PriceReferenceRow[],
  today: Date,
  cfg: ValueRiskConfig = DEFAULT_VALUE_RISK_CONFIG,
): ValueRisk {
  const cutoff = new Date(today.getTime() - cfg.windowDays * 86_400_000);
  const inWindow = references.filter((r) => r.hsCode === line.hsCode && new Date(r.observedAt + "T00:00:00Z") >= cutoff);

  const kg = D(line.netWeightKg ?? 0);
  const qty = D(line.quantity);
  const basis: ValueRisk["basis"] = kg.gt(0) ? "per_kg" : qty.gt(0) ? "per_unit" : "none";
  if (basis === "none") return { basis, own_median: null, p25: null, n: 0, deviation_pct: null, level: "insufficient_data", reasons: ["no_quantity_or_weight"] };

  let refs = inWindow.filter((r) => r.unitBasis === basis);
  // Prefer same origin when enough samples exist.
  const sameOrigin = refs.filter((r) => line.originCountry && r.originCountry === line.originCountry);
  const reasons: string[] = [];
  if (sameOrigin.length >= cfg.minSamples) {
    refs = sameOrigin;
    reasons.push("same_origin_basis");
  }
  if (refs.length < cfg.minSamples) {
    return { basis, own_median: null, p25: null, n: refs.length, deviation_pct: null, level: "insufficient_data", reasons: [...reasons, `n_lt_${cfg.minSamples}`] };
  }

  const unitPrice = D(line.customsValueGel).div(basis === "per_kg" ? kg : qty);
  const prices = refs.map((r) => D(r.unitPriceGel));
  const med = median(prices);
  const p25 = percentile(prices, 0.25);
  const deviation = med.isZero() ? D(0) : unitPrice.minus(med).div(med).mul(100); // negative = below median
  const below = deviation.neg();
  let level: ValueRisk["level"] = "none";
  if (below.gt(cfg.highBelowPct)) level = "high";
  else if (below.gt(cfg.mediumBelowPct)) level = "medium";
  else if (below.gt(cfg.mediumBelowPct / 2)) level = "low";
  if (level !== "none") reasons.push(`below_own_median_${below.toDecimalPlaces(1).toString()}pct`);
  if (unitPrice.lt(p25)) reasons.push("below_p25");

  return {
    basis,
    own_median: med.toDecimalPlaces(4).toString(),
    p25: p25.toDecimalPlaces(4).toString(),
    n: refs.length,
    deviation_pct: deviation.toDecimalPlaces(1).toString(),
    level,
    reasons,
  };
}

export const VALUE_RISK_ORDER: Record<ValueRisk["level"], number> = { none: 0, insufficient_data: 0, low: 1, medium: 2, high: 3 };

export function maxRiskLevel(levels: ValueRisk["level"][]): "none" | "low" | "medium" | "high" {
  const top = levels.reduce((m, l) => Math.max(m, VALUE_RISK_ORDER[l]), 0);
  return (["none", "low", "medium", "high"] as const)[top]!;
}
