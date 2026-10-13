import { describe, it, expect } from "vitest";
import { buildSadXml } from "@/lib/export/sad-xml/builder";
import { parseXml, diffXml } from "@/lib/export/sad-xml/diff";
import { buildSheet } from "@/lib/export/sheet/fields";
import { buildXlsx } from "@/lib/export/xls/build";
import type { DeclarationModel } from "@/lib/export/model";

export const sampleModel: DeclarationModel = {
  profile: "ge",
  profileVersion: "ge-experimental-0.1.0",
  generatedAt: "2026-10-13T10:00:00.000Z",
  experimental: true,
  validatedAgainstRealSample: false,
  tariffVersion: { id: "tv", source: "placeholder", effectiveFrom: "2026-01-01", isPlaceholder: true },
  feeSchedule: { effectiveFrom: "2022-05-14", mode: "pre_arrival_self", legalRef: "Decree №96 line 82" },
  fx: { currency: "USD", rate: "2.700000", date: "2026-10-13", source: "nbg" },
  declaration: {
    type: "IM",
    procedure: "4000",
    officeCode: "11111",
    officeName: "გეზი თბილისი",
    borderOffice: "SARPI",
    declarantName: "Demo Importer LLC",
    declarantTaxId: "400000000",
    declarantAddress: "Tbilisi",
    consigneeName: "Demo Importer LLC",
    consigneeTaxId: "400000000",
    exporterName: "SYNTHETIC Textile Ltd",
    exporterCountry: "TR",
    exporterAddress: "Istanbul",
    reference: "SHP-0001",
    registrationDate: "2026-10-13",
    preArrival: true,
    dispatchCountry: "TR",
    originCountry: "TR",
    tradingCountry: "TR",
    transportMode: "3",
    transportDocNo: "CMR-1",
    transportIdentity: "TR 34 ABC 123",
    incoterm: "FOB",
    incotermPlace: "Istanbul",
    totalPackages: 42,
    totalItems: 1,
    grossWeightKg: "340.000",
    netWeightKg: "320.000",
    invoiceCurrency: "USD",
    invoiceTotal: "2600.00",
    invoiceTotalGel: "7020.00",
    freightGel: "776.56",
    insuranceGel: "0.00",
    otherGel: "0.00",
    customsValueGel: "7796.56",
    dutyTotalGel: "935.59",
    exciseTotalGel: "0.00",
    vatTotalGel: "1571.79",
    feeGel: "150.00",
    totalPayableGel: "2657.38",
    items: [
      {
        itemNo: 1, hsCode: "6302510000", descriptionKa: "სუფრის თეთრეული ბამბის", descriptionRaw: "Cotton table linen", originCountry: "TR", quantity: "400", unit: "pcs", packages: 42, grossWeightKg: "340.000", netWeightKg: "320.000",
        invoiceValue: "2600.00", invoiceCurrency: "USD", invoiceValueGel: "7020.00", freightGel: "776.56", insuranceGel: "0.00", otherGel: "0.00", customsValueGel: "7796.56", dutyRate: "12", dutyGel: "935.59", exciseGel: "0.00", vatGel: "1571.79", totalGel: "2507.38",
        attachedDocs: [{ code: "380", name: "კომერციული ინვოისი", reference: "INV-1" }],
      },
    ],
  },
};

describe("SAD XML builder", () => {
  it("generates ASYCUDA structure with items and HS split", () => {
    const xml = buildSadXml(sampleModel);
    expect(xml).toContain("<ASYCUDA");
    expect(xml).toContain("<Commodity_code>63025100</Commodity_code>");
    expect(xml).toContain("<Precision_1>00</Precision_1>");
    expect(xml).toContain("<Customs_clearance_office_code>11111</Customs_clearance_office_code>");
    expect(xml).toContain("EXPERIMENTAL");
    expect(xml).toMatchSnapshot();
  });
  it("diff against itself is zero; against modified sample reports critical", () => {
    const ours = parseXml(buildSadXml(sampleModel));
    const same = parseXml(buildSadXml(sampleModel));
    expect(diffXml(ours, same).total).toBe(0);
    const base = buildSadXml(sampleModel);
    const oursMissing = parseXml(base.replace("<Precision_1>00</Precision_1>", ""));
    const sampleWithNational = parseXml(base.replace("<Container_flag>0</Container_flag>", "<Container_flag>0</Container_flag><Georgian_national_field>x</Georgian_national_field>"));
    const d = diffXml(oursMissing, sampleWithNational);
    expect(d.entries.some((e) => e.kind === "missing" && e.path.includes("Georgian_national_field"))).toBe(true);
    expect(d.entries.some((e) => e.kind === "missing" && e.path.includes("Precision_1"))).toBe(true);
    expect(d.critical).toBeGreaterThanOrEqual(1);
  });
});

describe("sheet + xlsx", () => {
  it("sheet has header, item, totals", () => {
    const s = buildSheet(sampleModel);
    expect(s.length).toBe(3);
    expect(s[1]!.fields.find((f) => f.box === "33")?.value).toBe("6302510000");
    expect(s[2]!.fields.find((f) => f.labelKa.startsWith("სულ გადასახდელი"))?.value).toBe("2657.38");
  });
  it("xlsx builds", async () => {
    const buf = await buildXlsx(sampleModel);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 2).toString()).toBe("PK");
  });
});
