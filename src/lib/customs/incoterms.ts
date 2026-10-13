/**
 * Incoterms 2020 → what must be added / deducted to reach the customs value at the Georgian border.
 * [VERIFIED] concept: CIF-type logic (freight + insurance up to the border).
 * [UNVERIFIED] exact Georgian rules for post-border transport deduction and default insurance %.
 * See docs/assumptions.md → "incoterms".
 */
export type Incoterm = "EXW" | "FCA" | "FAS" | "FOB" | "CFR" | "CPT" | "CIF" | "CIP" | "DAP" | "DPU" | "DDP";

export const INCOTERMS: Incoterm[] = ["EXW", "FCA", "FAS", "FOB", "CFR", "CPT", "CIF", "CIP", "DAP", "DPU", "DDP"];

export type IncotermRule = {
  code: Incoterm;
  addFreight: boolean;
  addInsurance: boolean;
  /** Delivered terms: cost up to a place in Georgia may include post-border transport which may be deductible [UNVERIFIED]. */
  mayDeductPostBorder: boolean;
  /** DDP includes destination duties/taxes in the price; they must be excluded from customs value [UNVERIFIED exact handling]. */
  priceIncludesImportTaxes: boolean;
  labelKa: string;
  verified: boolean;
};

export const INCOTERM_RULES: Record<Incoterm, IncotermRule> = {
  EXW: { code: "EXW", addFreight: true, addInsurance: true, mayDeductPostBorder: false, priceIncludesImportTaxes: false, labelKa: "ქარხნიდან (EXW)", verified: true },
  FCA: { code: "FCA", addFreight: true, addInsurance: true, mayDeductPostBorder: false, priceIncludesImportTaxes: false, labelKa: "გადამზიდველთან მიწოდება (FCA)", verified: true },
  FAS: { code: "FAS", addFreight: true, addInsurance: true, mayDeductPostBorder: false, priceIncludesImportTaxes: false, labelKa: "გემის გვერდით (FAS)", verified: true },
  FOB: { code: "FOB", addFreight: true, addInsurance: true, mayDeductPostBorder: false, priceIncludesImportTaxes: false, labelKa: "გემზე ჩატვირთვით (FOB)", verified: true },
  CFR: { code: "CFR", addFreight: false, addInsurance: true, mayDeductPostBorder: false, priceIncludesImportTaxes: false, labelKa: "ღირებულება და ფრახტი (CFR)", verified: true },
  CPT: { code: "CPT", addFreight: false, addInsurance: true, mayDeductPostBorder: false, priceIncludesImportTaxes: false, labelKa: "გადაზიდვა გადახდილია (CPT)", verified: true },
  CIF: { code: "CIF", addFreight: false, addInsurance: false, mayDeductPostBorder: false, priceIncludesImportTaxes: false, labelKa: "ღირებულება, დაზღვევა, ფრახტი (CIF)", verified: true },
  CIP: { code: "CIP", addFreight: false, addInsurance: false, mayDeductPostBorder: false, priceIncludesImportTaxes: false, labelKa: "გადაზიდვა და დაზღვევა გადახდილია (CIP)", verified: true },
  DAP: { code: "DAP", addFreight: false, addInsurance: false, mayDeductPostBorder: true, priceIncludesImportTaxes: false, labelKa: "მიწოდება ადგილზე (DAP)", verified: false },
  DPU: { code: "DPU", addFreight: false, addInsurance: false, mayDeductPostBorder: true, priceIncludesImportTaxes: false, labelKa: "მიწოდება გადმოტვირთვით (DPU)", verified: false },
  DDP: { code: "DDP", addFreight: false, addInsurance: false, mayDeductPostBorder: true, priceIncludesImportTaxes: true, labelKa: "მიწოდება ბაჟის გადახდით (DDP)", verified: false },
};

export function isIncoterm(v: string | null | undefined): v is Incoterm {
  return !!v && (INCOTERMS as string[]).includes(v.toUpperCase());
}

export function getIncotermRule(code: string | null | undefined): IncotermRule {
  const up = (code ?? "").toUpperCase();
  if (isIncoterm(up)) return INCOTERM_RULES[up];
  // Unknown / missing incoterm: treat conservatively as EXW (add everything) and flag it.
  return { ...INCOTERM_RULES.EXW, code: "EXW", labelKa: "უცნობი — ითვლება როგორც EXW", verified: false };
}
