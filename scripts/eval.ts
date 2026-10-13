/**
 * AI eval (`pnpm eval`): runs extraction + classification over tests/fixtures/invoices/<name>/
 * (invoice.json|pdf|jpg + expected.json) and reports: field accuracy, HS top-1/top-3, code-in-tariff,
 * citation-present. Results stored in eval_results (visible at /admin/evals).
 * Uses the configured AI (or mock when AI_MOCK / no key) and the ACTIVE tariff version.
 */
import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getDb, schema } from "../src/db/client";
import { extractInvoice } from "../src/lib/ai/extract";
import { classifyLine } from "../src/lib/ai/classify";
import { getActiveTariffVersion } from "../src/lib/tariff/import";
import { seedReference } from "../src/db/seed/reference";
import { importTariffCsv } from "../src/lib/tariff/import";
import { eq } from "drizzle-orm";

type Expected = {
  extraction: { currency: string; incoterm: string | null; invoice_total: string; lines: { line_no: number; line_total: string; quantity: string; unit_price: string }[] };
  hs: Record<string, string>; // line_no -> expected 10-digit code
  tags?: string[];
};

const db = await getDb();
await seedReference(db);
let tariff = await getActiveTariffVersion(db);
if (!tariff) {
  const csv = await fs.readFile(path.join(process.cwd(), "src/db/seed/tariff.placeholder.csv"), "utf8");
  await importTariffCsv(db, csv, { source: "placeholder (eval)", effectiveFrom: "2026-01-01" });
  tariff = (await getActiveTariffVersion(db))!;
}
let org = await db.query.organizations.findFirst({ where: eq(schema.organizations.slug, "eval") });
if (!org) [org] = await db.insert(schema.organizations).values({ name: "Eval", slug: "eval" }).returning();

const root = path.join(process.cwd(), "tests/fixtures/invoices");
const dirs = (await fs.readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
const details: unknown[] = [];
let fieldsTotal = 0, fieldsOk = 0, lines = 0, top1 = 0, top3 = 0, inTariff = 0, cands = 0, cited = 0, mismatchDetected = 0, mismatchExpected = 0;
const started = Date.now();

for (const name of dirs) {
  const dir = path.join(root, name);
  const expected = JSON.parse(await fs.readFile(path.join(dir, "expected.json"), "utf8")) as Expected;
  const files = (await fs.readdir(dir)).filter((f) => /^invoice\.(json|pdf|jpg|jpeg|png)$/i.test(f));
  if (!files.length) continue;
  const file = files[0]!;
  const mime = file.endsWith(".json") ? "application/json" : file.endsWith(".pdf") ? "application/pdf" : file.endsWith(".png") ? "image/png" : "image/jpeg";
  const data = await fs.readFile(path.join(dir, file));
  const t0 = Date.now();
  const { extraction, totalsMismatch } = await extractInvoice([{ name: `${name}.${file.split(".").pop()}`, mime, data }], { organizationId: org!.id });
  const ex = expected.extraction;
  const checks: [string, boolean][] = [
    ["currency", extraction.currency.toUpperCase() === ex.currency.toUpperCase()],
    ["incoterm", (extraction.incoterm ?? null)?.toUpperCase() === (ex.incoterm ?? null)?.toUpperCase()],
    ["invoice_total", Number(extraction.invoice_total) === Number(ex.invoice_total)],
    ["line_count", extraction.lines.length === ex.lines.length],
  ];
  for (const el of ex.lines) {
    const got = extraction.lines.find((l) => l.line_no === el.line_no);
    checks.push([`line${el.line_no}.total`, !!got && Number(got.line_total) === Number(el.line_total)]);
    checks.push([`line${el.line_no}.qty`, !!got && Number(got.quantity) === Number(el.quantity)]);
    checks.push([`line${el.line_no}.price`, !!got && Number(got.unit_price) === Number(el.unit_price)]);
  }
  fieldsTotal += checks.length;
  fieldsOk += checks.filter(([, ok]) => ok).length;
  if (expected.tags?.includes("totals_mismatch")) {
    mismatchExpected++;
    if (totalsMismatch) mismatchDetected++;
  }
  const hsResults: Record<string, unknown> = {};
  for (const l of extraction.lines) {
    const exp = expected.hs[String(l.line_no)];
    if (!exp) continue;
    lines++;
    const r = await classifyLine(db, { id: `${name}-${l.line_no}`, descriptionRaw: l.description_raw, descriptionNormalizedKa: l.description_normalized_ka, sku: l.sku, quantity: l.quantity, unit: l.unit, originCountry: l.origin_country }, { organizationId: org!.id, shipmentId: null, supplierId: null, supplierName: extraction.supplier.name, tariffVersionId: tariff.id });
    const codes = r.candidates.map((c) => c.hs_code);
    if (codes[0] === exp) top1++;
    if (codes.includes(exp)) top3++;
    for (const c of r.candidates) {
      cands++;
      const tl = await db.query.tariffLines.findFirst({ where: eq(schema.tariffLines.hsCode, c.hs_code) });
      if (tl) inTariff++;
      if (c.citations.length || c.confidence <= 0.5) cited++;
    }
    hsResults[l.line_no] = { expected: exp, got: codes, top1: codes[0] === exp };
  }
  details.push({ fixture: name, ms: Date.now() - t0, fields: checks.filter(([, ok]) => !ok).map(([k]) => k), totalsMismatch, hs: hsResults });
  console.log(`${name}: fields ${checks.filter(([, ok]) => ok).length}/${checks.length}, ${Date.now() - t0} ms`);
}

const summary = {
  fixtures: dirs.length,
  field_accuracy: fieldsTotal ? +(fieldsOk / fieldsTotal).toFixed(4) : null,
  hs_lines: lines,
  hs_top1: lines ? +(top1 / lines).toFixed(4) : null,
  hs_top3: lines ? +(top3 / lines).toFixed(4) : null,
  code_in_tariff: cands ? +(inTariff / cands).toFixed(4) : null,
  citation_or_capped: cands ? +(cited / cands).toFixed(4) : null,
  totals_mismatch_detected: mismatchExpected ? +(mismatchDetected / mismatchExpected).toFixed(4) : null,
  mock: process.env.AI_MOCK === "true" || !process.env.ANTHROPIC_API_KEY,
  tariff: tariff.source,
  total_ms: Date.now() - started,
  targets: { field_accuracy: 0.95, hs_top3: 0.85, code_in_tariff: 1, citation_or_capped: 0.95 },
};
await db.insert(schema.evalResults).values({ suite: "fixtures/invoices", summary, details });
console.log(JSON.stringify(summary, null, 2));
const pass = (summary.code_in_tariff ?? 1) === 1 && (summary.citation_or_capped ?? 1) >= 0.95;
process.exit(pass ? 0 : 1);
