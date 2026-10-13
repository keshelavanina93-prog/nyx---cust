import { z } from "zod";

const money = z.string().regex(/^-?\d+(\.\d{1,4})?$/, "decimal string");
const conf = z.number().min(0).max(1);

export const bboxSchema = z.object({ page: z.number().int().min(1), x: z.number(), y: z.number(), w: z.number(), h: z.number() }).nullable();

export const extractedLineSchema = z.object({
  line_no: z.number().int().min(1),
  description_raw: z.string().min(1),
  description_normalized_ka: z.string().nullable(),
  sku: z.string().nullable(),
  quantity: money,
  unit: z.string().nullable(),
  unit_price: money,
  line_total: money,
  origin_country: z.string().length(2).nullable().describe("ISO 3166-1 alpha-2"),
  net_weight_kg: money.nullable(),
  gross_weight_kg: money.nullable(),
  confidence: conf,
  bbox: bboxSchema,
});

export const invoiceExtractionSchema = z.object({
  supplier: z.object({ name: z.string().nullable(), country: z.string().length(2).nullable(), address: z.string().nullable(), tax_id: z.string().nullable(), confidence: conf }),
  buyer: z.object({ name: z.string().nullable(), tax_id: z.string().nullable(), confidence: conf }),
  invoice_number: z.string().nullable(),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  currency: z.string().length(3),
  incoterm: z.string().nullable(),
  incoterm_place: z.string().nullable(),
  lines: z.array(extractedLineSchema).min(1),
  invoice_total: money,
  freight_amount: money.nullable(),
  insurance_amount: money.nullable(),
  gross_weight_kg: money.nullable(),
  net_weight_kg: money.nullable(),
  packages: z.number().int().nullable(),
  origin_country: z.string().length(2).nullable(),
  language: z.string().nullable(),
  warnings: z.array(z.string()).default([]),
  field_confidence: z.record(z.string(), conf).default({}),
});
export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;

export const hsCandidateSchema = z.object({
  hs_code: z.string().regex(/^\d{10}$/),
  confidence: conf,
  reasoning_ka: z.string().max(600),
  citations: z.array(z.object({ tariff_line_id: z.string(), quote: z.string().min(3) })).max(3),
  gri_rules: z.array(z.string()).max(4),
  why_not_others_ka: z.string().nullable(),
});

export const hsClassificationSchema = z.object({
  candidates: z.array(hsCandidateSchema).length(3),
  questions_for_user: z.array(z.string()).max(3),
});
export type HsClassification = z.infer<typeof hsClassificationSchema>;
