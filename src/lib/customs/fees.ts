/**
 * Declaration fees by customs value tier [VERIFIED: Decree №96, 2022 №201 edition — research.md §2.3].
 * Thresholds: ≤3 000 / 3 000–15 000 / >15 000 ₾. Rows come from `fee_schedules` (versioned by effective_from).
 * Doubling off working hours applies ONLY to rows with doubles_off_hours = true (never to pre_arrival_self).
 */
import Decimal from "decimal.js";
import { D } from "@/lib/money";
import type { FeeAlternative } from "@/db/schema";

export const FEE_MODES = [
  "pre_arrival_self",
  "pre_arrival_rs_staff_electronic",
  "pre_arrival_rs_staff_paper",
  "post_arrival_self",
  "post_arrival_rs_staff",
] as const;
export type FeeMode = (typeof FEE_MODES)[number];

export type FeeScheduleRow = {
  mode: FeeMode;
  valueMin: string;
  valueMax: string | null;
  feeGel: string;
  doublesOffHours: boolean;
  legalRef: string;
  needsReverification: boolean;
  effectiveFrom: string;
};

export function pickTier(rows: FeeScheduleRow[], mode: FeeMode, customsValueGel: Decimal.Value): FeeScheduleRow | undefined {
  const v = D(customsValueGel);
  return rows
    .filter((r) => r.mode === mode)
    .find((r) => v.gte(r.valueMin) && (r.valueMax === null || v.lte(r.valueMax)));
}

export function computeFee(
  rows: FeeScheduleRow[],
  mode: FeeMode,
  customsValueGel: Decimal.Value,
  offHours: boolean,
): FeeAlternative {
  const tier = pickTier(rows, mode, customsValueGel);
  if (!tier) throw new Error(`fee_schedule missing for mode=${mode} value=${String(customsValueGel)}`);
  const applied = tier.doublesOffHours && offHours;
  const fee = applied ? D(tier.feeGel).mul(2) : D(tier.feeGel);
  return {
    mode,
    legal_ref: tier.legalRef,
    base_fee_gel: D(tier.feeGel).toFixed(2),
    doubles_off_hours: tier.doublesOffHours,
    off_hours_applied: applied,
    fee_gel: fee.toFixed(2),
    needs_reverification: tier.needsReverification,
  };
}

export function computeAllFees(rows: FeeScheduleRow[], customsValueGel: Decimal.Value, offHours: boolean): FeeAlternative[] {
  return FEE_MODES.map((m) => computeFee(rows, m, customsValueGel, offHours));
}

/** Default mode: pre-arrival self; if goods already arrived → post-arrival self (brief §5.5). */
export function defaultMode(goodsAlreadyArrived: boolean): FeeMode {
  return goodsAlreadyArrived ? "post_arrival_self" : "pre_arrival_self";
}

/** Pre-arrival declarations may be lodged no earlier than 45 calendar days before import [VERIFIED]. */
export function preArrivalWindowCheck(expectedArrival: string | null | undefined, today: Date): { ok: boolean; daysUntil: number | null; reason?: string } {
  if (!expectedArrival) return { ok: true, daysUntil: null, reason: "no_eta" };
  const eta = new Date(expectedArrival + "T00:00:00Z");
  const t = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const days = Math.round((eta.getTime() - t.getTime()) / 86_400_000);
  if (days > 45) return { ok: false, daysUntil: days, reason: "too_early" };
  if (days < 0) return { ok: false, daysUntil: days, reason: "already_arrived" };
  return { ok: true, daysUntil: days };
}
