/**
 * Mock AI used when AI_MOCK=true or no ANTHROPIC_API_KEY. Deterministic, fixture-aware:
 * - If the uploaded file is a JSON fixture (tests/fixtures/invoices/*.json with "extraction"), it is returned.
 * - If the file name matches a fixture directory, its expected.json is used.
 * - Otherwise a SYNTHETIC demo invoice is produced from the file name.
 * Classification: tariff search results ranked, confidence by rank, citations from the tariff lines.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { InvoiceExtraction, HsClassification } from "./schemas";
import { invoiceExtractionSchema } from "./schemas";
import type { TariffHit } from "@/lib/tariff/search";

export async function mockExtract(file: { name: string; mime: string; data: Buffer }): Promise<InvoiceExtraction> {
  // 1. JSON fixture uploaded directly
  if (file.mime.includes("json") || file.name.endsWith(".json")) {
    const parsed = JSON.parse(file.data.toString("utf8"));
    const ex = parsed.extraction ?? parsed;
    return invoiceExtractionSchema.parse(ex);
  }
  // 2. Fixture folder lookup by base name
  const base = path.basename(file.name).replace(/\.[^.]+$/, "");
  const fixturePath = path.join(process.cwd(), "tests", "fixtures", "invoices", base, "expected.json");
  try {
    const txt = await fs.readFile(fixturePath, "utf8");
    const parsed = JSON.parse(txt);
    return invoiceExtractionSchema.parse(parsed.extraction ?? parsed);
  } catch {
    /* fallthrough */
  }
  // 3. Synthetic demo
  return invoiceExtractionSchema.parse({
    supplier: { name: "SYNTHETIC Textile Ltd", country: "TR", address: "Istanbul", tax_id: null, confidence: 0.9 },
    buyer: { name: "Demo Importer LLC", tax_id: null, confidence: 0.8 },
    invoice_number: `SYN-${base.slice(0, 8).toUpperCase()}`,
    invoice_date: new Date().toISOString().slice(0, 10),
    currency: "USD",
    incoterm: "FOB",
    incoterm_place: "Istanbul",
    lines: [
      { line_no: 1, description_raw: "Cotton table linen, printed, 100% cotton", description_normalized_ka: "სუფრის თეთრეული ბამბის, ნაბეჭდი", sku: "TL-100", quantity: "400", unit: "pcs", unit_price: "6.50", line_total: "2600.00", origin_country: "TR", net_weight_kg: "320.000", gross_weight_kg: "340.000", confidence: 0.92, bbox: { page: 1, x: 0.05, y: 0.42, w: 0.9, h: 0.04 } },
      { line_no: 2, description_raw: "PVC floor covering rolls 2m", description_normalized_ka: "იატაკის საფარი PVC-სგან, რულონებში", sku: "PVC-2M", quantity: "600", unit: "m2", unit_price: "3.20", line_total: "1920.00", origin_country: "TR", net_weight_kg: "900.000", gross_weight_kg: "930.000", confidence: 0.88, bbox: { page: 1, x: 0.05, y: 0.47, w: 0.9, h: 0.04 } },
      { line_no: 3, description_raw: "Terry towels 70x140 cotton", description_normalized_ka: "პირსახოცები ხაოიანი ბამბის 70x140", sku: "TW-70", quantity: "300", unit: "pcs", unit_price: "2.60", line_total: "780.00", origin_country: "TR", net_weight_kg: "150.000", gross_weight_kg: "160.000", confidence: 0.9, bbox: { page: 1, x: 0.05, y: 0.52, w: 0.9, h: 0.04 } },
    ],
    invoice_total: "5300.00",
    freight_amount: null,
    insurance_amount: null,
    gross_weight_kg: "1430.000",
    net_weight_kg: "1370.000",
    packages: 42,
    origin_country: "TR",
    language: "en",
    warnings: ["SYNTHETIC — mock extraction (AI_MOCK)"],
    field_confidence: { currency: 0.95, incoterm: 0.85, invoice_total: 0.95, invoice_number: 0.9, invoice_date: 0.9, supplier_name: 0.9 },
  });
}

function quoteOf(hit: TariffHit): string {
  const d = hit.descriptionKa || hit.descriptionEn;
  return d.split(/\s+/).slice(0, 12).join(" ");
}

export function mockClassify(line: { description: string; descriptionKa?: string | null }, hits: TariffHit[]): HsClassification {
  const top = hits.slice(0, 3);
  while (top.length < 3 && hits.length) top.push(hits[top.length % hits.length]!);
  if (top.length === 0) throw new Error("mock classify: no tariff hits");
  const confs = [0.86, 0.62, 0.41];
  return {
    candidates: top.map((h, i) => ({
      hs_code: h.hsCode,
      confidence: Math.min(confs[i]!, Math.max(0.2, confs[i]! * (h.rank > 0 ? 1 : 0.6))),
      reasoning_ka: `[MOCK] აღწერა „${line.descriptionKa ?? line.description}“ ემთხვევა ტარიფის ხაზს ${h.hsCode}: ${h.descriptionKa}. ეს არის სატესტო რეჟიმის მსჯელობა.`,
      citations: [{ tariff_line_id: h.id, quote: quoteOf(h) }],
      gri_rules: i === 0 ? ["GRI 1", "GRI 6"] : ["GRI 3(a)"],
      why_not_others_ka: i === 0 ? "სხვა კანდიდატები ნაკლებად სპეციფიკურია მასალის/დანიშნულების მიხედვით." : null,
    })),
    questions_for_user: ["რა მასალისგანაა ნაწარმი (ბამბა, სინთეტიკა, შერეული)?", "საცალო შეფუთვაშია თუ ნაყარად?"],
  };
}
