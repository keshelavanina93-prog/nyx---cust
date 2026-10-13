/**
 * Duties per line: import duty (ad valorem or specific), excise, VAT.
 * VAT = rate × (CV + duty [+ excise]) — 18% and "CIF + duty" are [VERIFIED];
 * including excise in the VAT base is [UNVERIFIED] → configurable flag (default true, see docs/assumptions.md).
 */
import Decimal from "decimal.js";
import { D, roundMoney, type RoundingMode } from "@/lib/money";
import type { SpecificRate } from "@/db/schema";

export type DutyTariff = {
  hsCode: string;
  dutyRate: string; // percent
  dutySpecific?: SpecificRate | null;
  exciseRate?: string | null; // percent
  exciseSpecific?: SpecificRate | null;
  vatExempt: boolean;
};

export type DutyLineInput = {
  id: string;
  customsValueGel: Decimal;
  quantity: string;
  netWeightKg?: string | null;
  tariff: DutyTariff;
};

export type DutyConfig = {
  vatRate: string; // e.g. "18"
  vatIncludesExcise: boolean;
  rounding?: RoundingMode;
};

export type DutyLineResult = {
  id: string;
  dutyGel: Decimal;
  exciseGel: Decimal;
  vatBaseGel: Decimal;
  vatGel: Decimal;
  totalGel: Decimal;
  formulas: Record<string, string>;
};

function specificAmount(spec: SpecificRate | null | undefined, qty: string, kg: string | null | undefined): Decimal | null {
  if (!spec) return null;
  const base = spec.per === "kg" ? D(kg ?? 0) : D(qty);
  return D(spec.amount_gel).mul(base);
}

export function computeLineDuties(line: DutyLineInput, cfg: DutyConfig): DutyLineResult {
  const r = cfg.rounding ?? "half_up";
  const cv = line.customsValueGel;
  const adValorem = cv.mul(D(line.tariff.dutyRate)).div(100);
  const specific = specificAmount(line.tariff.dutySpecific, line.quantity, line.netWeightKg);
  // If both exist, the tariff usually says "whichever is higher" [ASSUMPTION]; configurable later.
  const dutyRaw = specific ? Decimal.max(adValorem, specific) : adValorem;
  const dutyGel = roundMoney(dutyRaw, r);

  const exciseAd = line.tariff.exciseRate ? cv.mul(D(line.tariff.exciseRate)).div(100) : D(0);
  const exciseSpec = specificAmount(line.tariff.exciseSpecific, line.quantity, line.netWeightKg);
  const exciseGel = roundMoney(exciseSpec ? Decimal.max(exciseAd, exciseSpec) : exciseAd, r);

  const vatBase = cv.plus(dutyGel).plus(cfg.vatIncludesExcise ? exciseGel : 0);
  const vatGel = line.tariff.vatExempt ? D(0) : roundMoney(vatBase.mul(D(cfg.vatRate)).div(100), r);
  const totalGel = dutyGel.plus(exciseGel).plus(vatGel);

  return {
    id: line.id,
    dutyGel,
    exciseGel,
    vatBaseGel: roundMoney(vatBase, r),
    vatGel,
    totalGel,
    formulas: {
      duty: specific
        ? `max(${cv.toFixed(2)} × ${line.tariff.dutyRate}%, ${line.tariff.dutySpecific!.amount_gel} ₾ × ${line.tariff.dutySpecific!.per === "kg" ? line.netWeightKg + " კგ" : line.quantity + " ერთ."})`
        : `${cv.toFixed(2)} × ${line.tariff.dutyRate}%`,
      excise: exciseGel.isZero() ? "აქციზი არ ვრცელდება" : `${cv.toFixed(2)} × ${line.tariff.exciseRate ?? 0}%${exciseSpec ? " / სპეციფიკური" : ""}`,
      vat: line.tariff.vatExempt
        ? "დღგ-სგან გათავისუფლებული"
        : `(${cv.toFixed(2)} + ${dutyGel.toFixed(2)}${cfg.vatIncludesExcise ? " + " + exciseGel.toFixed(2) : ""}) × ${cfg.vatRate}%`,
    },
  };
}
