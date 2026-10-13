/**
 * Declaration model consumed by all exporters (SAD XML, field sheet, XLS).
 * Built from shipment + confirmed HS decisions + approved calculation in `src/lib/export/build-model.ts`.
 */
export type DeclarationItem = {
  itemNo: number;
  hsCode: string;
  descriptionKa: string;
  descriptionRaw: string;
  originCountry: string | null;
  quantity: string;
  unit: string | null;
  packages: number | null;
  grossWeightKg: string | null;
  netWeightKg: string | null;
  invoiceValue: string;
  invoiceCurrency: string;
  invoiceValueGel: string;
  freightGel: string;
  insuranceGel: string;
  otherGel: string;
  customsValueGel: string;
  dutyRate: string;
  dutyGel: string;
  exciseGel: string;
  vatGel: string;
  totalGel: string;
  attachedDocs: { code: string; name: string; reference: string | null }[];
};

export type DeclarationModel = {
  profile: "ge";
  profileVersion: string;
  generatedAt: string;
  experimental: boolean;
  validatedAgainstRealSample: boolean;
  tariffVersion: { id: string; source: string; effectiveFrom: string; isPlaceholder: boolean };
  feeSchedule: { effectiveFrom: string; mode: string; legalRef: string };
  fx: { currency: string; rate: string; date: string; source: string };
  declaration: {
    type: "IM";
    procedure: string; // "4000" import for free circulation [ASSUMPTION — verify]
    officeCode: string | null;
    officeName: string | null;
    borderOffice: string | null;
    declarantName: string;
    declarantTaxId: string | null;
    declarantAddress: string | null;
    consigneeName: string;
    consigneeTaxId: string | null;
    exporterName: string | null;
    exporterCountry: string | null;
    exporterAddress: string | null;
    reference: string;
    registrationDate: string;
    preArrival: boolean;
    dispatchCountry: string | null;
    originCountry: string | null;
    tradingCountry: string | null;
    transportMode: string | null;
    transportDocNo: string | null;
    transportIdentity: string | null;
    incoterm: string | null;
    incotermPlace: string | null;
    totalPackages: number | null;
    totalItems: number;
    grossWeightKg: string | null;
    netWeightKg: string | null;
    invoiceCurrency: string;
    invoiceTotal: string;
    invoiceTotalGel: string;
    freightGel: string;
    insuranceGel: string;
    otherGel: string;
    customsValueGel: string;
    dutyTotalGel: string;
    exciseTotalGel: string;
    vatTotalGel: string;
    feeGel: string;
    totalPayableGel: string;
    items: DeclarationItem[];
  };
};
