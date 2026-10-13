import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type RoundingMode = "half_up" | "half_even" | "down" | "up";

const ROUNDING: Record<RoundingMode, Decimal.Rounding> = {
  half_up: Decimal.ROUND_HALF_UP,
  half_even: Decimal.ROUND_HALF_EVEN,
  down: Decimal.ROUND_DOWN,
  up: Decimal.ROUND_UP,
};

export const D = (v: Decimal.Value | null | undefined): Decimal => new Decimal(v ?? 0);

/** Round money to 2 decimals using configurable rule (brief §5.4: rounding rule is [UNVERIFIED] => configurable). */
export function roundMoney(v: Decimal.Value, mode: RoundingMode = "half_up", dp = 2): Decimal {
  return new Decimal(v).toDecimalPlaces(dp, ROUNDING[mode]);
}

export function toMoneyString(v: Decimal.Value, mode: RoundingMode = "half_up"): string {
  return roundMoney(v, mode).toFixed(2);
}

export function sum(values: Decimal.Value[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(v), new Decimal(0));
}

/** Format as `1 234,56 ₾` ([ASSUMPTION] Georgian format, configurable in app_settings `money_format`). */
export function formatGel(v: Decimal.Value | null | undefined, opts: { symbol?: string; dp?: number } = {}): string {
  const dp = opts.dp ?? 2;
  const symbol = opts.symbol ?? "₾";
  const d = new Decimal(v ?? 0).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP);
  const [int, frac] = d.abs().toFixed(dp).split(".");
  const grouped = (int ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = d.isNegative() ? "−" : "";
  return `${sign}${grouped}${dp > 0 ? "," + frac : ""}${symbol ? " " + symbol : ""}`;
}

export function formatAmount(v: Decimal.Value | null | undefined, currency: string, dp = 2): string {
  return formatGel(v, { symbol: currency, dp });
}

export function formatPercent(v: Decimal.Value | null | undefined, dp = 1): string {
  return `${new Decimal(v ?? 0).toDecimalPlaces(dp).toString().replace(".", ",")}%`;
}
