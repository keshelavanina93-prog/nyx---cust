/**
 * Tariff CSV parsing + validation (dry run). Columns (brief §8):
 * hs_code, description_ka, description_en, duty_rate, duty_specific, excise_rate, excise_specific,
 * vat_exempt, unit, requires_docs, chapter_notes, heading_notes. A mapping may rename columns.
 */
import { z } from "zod";
import type { SpecificRate } from "@/db/schema";

export const TARIFF_COLUMNS = [
  "hs_code",
  "description_ka",
  "description_en",
  "duty_rate",
  "duty_specific",
  "excise_rate",
  "excise_specific",
  "vat_exempt",
  "unit",
  "requires_docs",
  "chapter_notes",
  "heading_notes",
] as const;
export type TariffColumn = (typeof TARIFF_COLUMNS)[number];

const specificSchema = z.object({ amount_gel: z.string().regex(/^\d+(\.\d{1,4})?$/), per: z.enum(["unit", "kg", "litre"]) });

export const tariffRowSchema = z.object({
  hs_code: z.string().regex(/^\d{10}$/, "HS code must be 10 digits"),
  description_ka: z.string().min(1),
  description_en: z.string().default(""),
  duty_rate: z.string().regex(/^\d+(\.\d{1,3})?$/).refine((v) => Number(v) <= 100, "duty_rate > 100"),
  duty_specific: specificSchema.nullable(),
  excise_rate: z.string().regex(/^\d+(\.\d{1,3})?$/).nullable(),
  excise_specific: specificSchema.nullable(),
  vat_exempt: z.boolean(),
  unit: z.string().nullable(),
  requires_docs: z.array(z.string()),
  chapter_notes: z.string().nullable(),
  heading_notes: z.string().nullable(),
});
export type TariffRow = z.infer<typeof tariffRowSchema>;

/** Minimal RFC4180-ish CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim().length));
}

function parseJsonMaybe<T>(v: string, fallback: T): T {
  const s = v.trim();
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export type DryRunReport = {
  total: number;
  valid: TariffRow[];
  errors: { line: number; message: string }[];
  duplicates: string[];
  hierarchy: { chapters: number; headings: number; subheadings: number };
  isPlaceholder: boolean;
};

export function dryRun(text: string, mapping?: Partial<Record<TariffColumn, string>>): DryRunReport {
  const rows = parseCsv(text);
  const header = rows[0]?.map((h) => h.trim()) ?? [];
  const colIndex = (col: TariffColumn) => {
    const name = mapping?.[col] ?? col;
    return header.indexOf(name);
  };
  const idx = Object.fromEntries(TARIFF_COLUMNS.map((c) => [c, colIndex(c)])) as Record<TariffColumn, number>;
  const errors: DryRunReport["errors"] = [];
  const valid: TariffRow[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];
  let isPlaceholder = false;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]!;
    if (cells[0]?.trim().startsWith("#")) {
      if (/PLACEHOLDER/i.test(cells.join(","))) isPlaceholder = true;
      continue;
    }
    const get = (c: TariffColumn) => (idx[c] >= 0 ? (cells[idx[c]] ?? "").trim() : "");
    const raw = {
      hs_code: get("hs_code").replace(/\s+/g, ""),
      description_ka: get("description_ka"),
      description_en: get("description_en"),
      duty_rate: get("duty_rate") || "0",
      duty_specific: parseJsonMaybe<SpecificRate | null>(get("duty_specific"), null),
      excise_rate: get("excise_rate") || null,
      excise_specific: parseJsonMaybe<SpecificRate | null>(get("excise_specific"), null),
      vat_exempt: /^(true|1|yes)$/i.test(get("vat_exempt")),
      unit: get("unit") || null,
      requires_docs: parseJsonMaybe<string[]>(get("requires_docs"), []),
      chapter_notes: get("chapter_notes") || null,
      heading_notes: get("heading_notes") || null,
    };
    if (/\[PLACEHOLDER\]/.test(raw.description_ka)) isPlaceholder = true;
    const parsed = tariffRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ line: r + 1, message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
      continue;
    }
    if (seen.has(parsed.data.hs_code)) {
      duplicates.push(parsed.data.hs_code);
      continue;
    }
    seen.add(parsed.data.hs_code);
    valid.push(parsed.data);
  }
  const chapters = new Set(valid.map((v) => v.hs_code.slice(0, 2))).size;
  const headings = new Set(valid.map((v) => v.hs_code.slice(0, 4))).size;
  const subheadings = new Set(valid.map((v) => v.hs_code.slice(0, 6))).size;
  return { total: rows.length - 1, valid, errors, duplicates, hierarchy: { chapters, headings, subheadings }, isPlaceholder };
}
