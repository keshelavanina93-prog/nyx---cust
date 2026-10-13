import type { ShipmentFull } from "@/lib/shipments/queries";
import type { DeclarationModel, DeclarationItem } from "./model";
import { GE_DOC_CODES, GE_PROFILE_VERSION } from "./sad-xml/profiles/ge";
import { GE_OFFICES } from "@/db/seed/reference";

export function buildDeclarationModel(
  full: ShipmentFull,
  org: { name: string; taxId: string | null; address: string | null },
  tariff: { id: string; source: string; effectiveFrom: string; isPlaceholder: boolean },
  opts: { xmlValidated: boolean; feeLegalRef: string },
): DeclarationModel {
  const calc = full.calculation;
  if (!calc) throw new Error("no calculation");
  const s = full.shipment;
  const office = GE_OFFICES.find((o) => o.code === s.destinationOffice);
  const attached = full.documents.filter((d) => d.kind !== "sad_xml_sample").map((d) => ({ code: GE_DOC_CODES[d.kind]?.code ?? "ZZZ", name: GE_DOC_CODES[d.kind]?.nameKa ?? d.kind, reference: d.kind === "invoice" ? (s.invoiceNumber ?? null) : d.kind === "cmr" || d.kind === "bl" || d.kind === "awb" ? (s.transportDocNo ?? null) : null }));

  const items: DeclarationItem[] = calc.breakdown.map((b) => {
    const line = full.lines.find((l) => l.id === b.line_id)!;
    return {
      itemNo: b.line_no,
      hsCode: b.hs_code,
      descriptionKa: line.descriptionNormalizedKa ?? line.descriptionRaw,
      descriptionRaw: line.descriptionRaw,
      originCountry: line.originCountry ?? s.originCountry,
      quantity: line.quantity,
      unit: line.unit,
      packages: null,
      grossWeightKg: line.grossWeightKg,
      netWeightKg: line.netWeightKg,
      invoiceValue: b.invoice_value,
      invoiceCurrency: line.currency,
      invoiceValueGel: b.invoice_value_gel,
      freightGel: b.freight_alloc_gel,
      insuranceGel: b.insurance_alloc_gel,
      otherGel: b.other_alloc_gel,
      customsValueGel: b.customs_value_gel,
      dutyRate: b.duty_rate,
      dutyGel: b.duty_gel,
      exciseGel: b.excise_gel,
      vatGel: b.vat_gel,
      totalGel: b.total_gel,
      attachedDocs: attached,
    };
  });
  const sum = (k: keyof DeclarationItem) => items.reduce((a, i) => a + Number(i[k] ?? 0), 0).toFixed(2);

  return {
    profile: "ge",
    profileVersion: GE_PROFILE_VERSION,
    generatedAt: new Date().toISOString(),
    experimental: !opts.xmlValidated,
    validatedAgainstRealSample: opts.xmlValidated,
    tariffVersion: tariff,
    feeSchedule: { effectiveFrom: calc.feeScheduleEffectiveFrom, mode: calc.feeMode, legalRef: opts.feeLegalRef },
    fx: { currency: calc.fxCurrency, rate: calc.fxRate, date: calc.fxDate, source: calc.fxSource },
    declaration: {
      type: "IM",
      procedure: "4000",
      officeCode: s.destinationOffice,
      officeName: office?.name_ka ?? null,
      borderOffice: s.borderPost,
      declarantName: org.name,
      declarantTaxId: org.taxId,
      declarantAddress: org.address,
      consigneeName: org.name,
      consigneeTaxId: org.taxId,
      exporterName: full.supplier?.name ?? s.supplierNameRaw,
      exporterCountry: full.supplier?.country ?? s.dispatchCountry,
      exporterAddress: full.supplier?.address ?? null,
      reference: s.reference,
      registrationDate: s.declarationRegistrationDate ?? calc.fxDate,
      preArrival: s.mode.startsWith("pre_arrival"),
      dispatchCountry: s.dispatchCountry ?? full.supplier?.country ?? null,
      originCountry: s.originCountry,
      tradingCountry: full.supplier?.country ?? s.dispatchCountry,
      transportMode: s.transportMode,
      transportDocNo: s.transportDocNo,
      transportIdentity: s.transportDocNo,
      incoterm: s.incoterm,
      incotermPlace: s.incotermPlace,
      totalPackages: s.packages,
      totalItems: items.length,
      grossWeightKg: s.grossWeightKg,
      netWeightKg: s.netWeightKg,
      invoiceCurrency: s.currency,
      invoiceTotal: s.invoiceTotal ?? items.reduce((a, i) => a + Number(i.invoiceValue), 0).toFixed(2),
      invoiceTotalGel: sum("invoiceValueGel"),
      freightGel: sum("freightGel"),
      insuranceGel: sum("insuranceGel"),
      otherGel: sum("otherGel"),
      customsValueGel: calc.customsValueGel,
      dutyTotalGel: calc.dutyTotal,
      exciseTotalGel: calc.exciseTotal,
      vatTotalGel: calc.vatTotal,
      feeGel: calc.feeGel,
      totalPayableGel: calc.totalPayableGel,
      items,
    },
  };
}
