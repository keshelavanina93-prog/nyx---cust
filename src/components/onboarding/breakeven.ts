import Decimal from "decimal.js";

export type AccessFee = { termMonths: number; feeGel: string };

export type BreakEvenInput = {
  /** declarations per year */
  declarations: number | string;
  /** broker fee per declaration, GEL (comma or dot decimals) */
  brokerFee: number | string;
  /** access term in months */
  term: number | string;
  fees: AccessFee[];
};

export type BreakEven = {
  declarations: number;
  brokerFee: Decimal;
  term: number;
  brokerYear: Decimal;
  accessPerYear: Decimal;
  saving: Decimal;
  /** number of declarations per year from which self-declaring is cheaper */
  breakeven: number;
};

/** Fallback when the fee table has no row for the term (500 GEL = 12 month access, №96 art. 46). */
const FALLBACK_ACCESS_PER_YEAR = 500;

function toDecimal(v: number | string, fallback = 0): Decimal {
  try {
    const d = new Decimal(typeof v === "string" ? v.trim().replace(",", ".") : v);
    return d.isFinite() && !d.isNeg() ? d : new Decimal(fallback);
  } catch {
    return new Decimal(fallback);
  }
}

/**
 * Break-even of the eCustoms access fee against a broker. Pure and shared between the server render
 * (initial values from the query string) and the live client-side recalculation.
 */
export function computeBreakEven(input: BreakEvenInput): BreakEven {
  const declarations = Math.max(0, Math.floor(toDecimal(input.declarations).toNumber()));
  const brokerFee = toDecimal(input.brokerFee);
  const term = Math.floor(toDecimal(input.term, 12).toNumber()) || 12;
  const feeRow = input.fees.find((f) => f.termMonths === term) ?? input.fees.find((f) => f.termMonths === 12);
  const accessPerYear = feeRow ? new Decimal(feeRow.feeGel).mul(12).div(feeRow.termMonths) : new Decimal(FALLBACK_ACCESS_PER_YEAR);
  const brokerYear = brokerFee.mul(declarations);
  const saving = brokerYear.minus(accessPerYear);
  const breakeven = brokerFee.gt(0) ? accessPerYear.div(brokerFee).ceil().toNumber() : 0;
  return { declarations, brokerFee, term, brokerYear, accessPerYear, saving, breakeven };
}
