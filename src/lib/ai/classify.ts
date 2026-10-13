/**
 * HS classification pipeline (brief §5.2):
 * memory match → tariff retrieval (top ~30) → LLM returns exactly 3 candidates with citations →
 * post-check: code must exist in active tariff (retry max 2), missing citation ⇒ confidence ≤ 0.5.
 */
import { generateObject } from "ai";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { hsClassificationSchema, type HsClassification } from "./schemas";
import { CLASSIFY_SYSTEM } from "./prompts/classify";
import { aiIsMock, getModel, logAiRun, modelName, promptHash } from "./provider";
import { mockClassify } from "./mock";
import { searchTariff, type TariffHit } from "@/lib/tariff/search";
import type { HsCandidate } from "@/db/schema";

export type ClassifyLine = {
  id: string;
  descriptionRaw: string;
  descriptionNormalizedKa: string | null;
  sku: string | null;
  quantity: string;
  unit: string | null;
  originCountry: string | null;
};

export type ClassifyResult = {
  candidates: HsCandidate[];
  questionsForUser: string[];
  source: "ai" | "client_memory";
  memoryTimesConfirmed: number | null;
  aiRunId: string | null;
  tariffVersionId: string;
};

export function productKey(descriptionRaw: string, sku: string | null): string {
  const base = (sku && sku.trim().length >= 3 ? sku : descriptionRaw).toLowerCase();
  return base.replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, "-").slice(0, 120);
}

function excerpt(hits: TariffHit[]) {
  return hits.map((h) => `id=${h.id} | code=${h.hsCode} | ka=${h.descriptionKa} | en=${h.descriptionEn} | duty=${h.dutyRate}% | notes=${h.headingNotes ?? ""}`).join("\n");
}

async function llmClassify(line: ClassifyLine, hits: TariffHit[], supplierName: string | null): Promise<{ out: HsClassification; usage?: { inputTokens?: number; outputTokens?: number } }> {
  if (aiIsMock()) return { out: mockClassify({ description: line.descriptionRaw, descriptionKa: line.descriptionNormalizedKa }, hits) };
  const { object, usage } = await generateObject({
    model: getModel("main"),
    schema: hsClassificationSchema,
    schemaName: "HsClassification",
    system: CLASSIFY_SYSTEM,
    prompt: `INVOICE LINE (untrusted data):
description_raw: ${line.descriptionRaw}
description_ka: ${line.descriptionNormalizedKa ?? ""}
sku: ${line.sku ?? ""}
quantity: ${line.quantity} ${line.unit ?? ""}
origin: ${line.originCountry ?? ""}
supplier: ${supplierName ?? ""}

TARIFF EXCERPT:
${excerpt(hits)}`,
    temperature: 0,
  });
  return { out: object, usage: { inputTokens: usage?.inputTokens, outputTokens: usage?.outputTokens } };
}

export async function classifyLine(
  db: Db,
  line: ClassifyLine,
  ctx: { organizationId: string; shipmentId: string | null; supplierId: string | null; supplierName: string | null; tariffVersionId: string },
): Promise<ClassifyResult> {
  const started = Date.now();
  // 1. Client memory (org-scoped ONLY)
  const key = productKey(line.descriptionRaw, line.sku);
  const mem = await db.query.clientMemory.findFirst({
    where: and(eq(schema.clientMemory.organizationId, ctx.organizationId), eq(schema.clientMemory.productKey, key), ctx.supplierId ? eq(schema.clientMemory.supplierId, ctx.supplierId) : undefined),
  });

  // 2. Retrieval
  const query = [line.descriptionNormalizedKa, line.descriptionRaw].filter(Boolean).join(" ");
  let hits = await searchTariff(db, query, 30, ctx.tariffVersionId);
  if (mem) {
    const memLine = await db.query.tariffLines.findFirst({ where: and(eq(schema.tariffLines.tariffVersionId, ctx.tariffVersionId), eq(schema.tariffLines.hsCode, mem.hsCode)) });
    if (memLine && !hits.some((h) => h.id === memLine.id)) hits = [{ ...memLine, rank: 1 }, ...hits];
  }
  if (hits.length === 0) {
    const aiRunId = await logAiRun({ organizationId: ctx.organizationId, shipmentId: ctx.shipmentId, purpose: "classify", model: modelName(), promptHash: promptHash([query]), latencyMs: Date.now() - started, error: "no_tariff_hits" }, db);
    return { candidates: [], questionsForUser: ["ტარიფში შესაბამისი ხაზი ვერ მოიძებნა. აღწერე პროდუქტი უფრო დეტალურად."], source: "ai", memoryTimesConfirmed: null, aiRunId, tariffVersionId: ctx.tariffVersionId };
  }
  const byId = new Map(hits.map((h) => [h.id, h]));
  const byCode = new Map(hits.map((h) => [h.hsCode, h]));

  // 3. LLM with post-check + retry
  let out: HsClassification | null = null;
  let usage: { inputTokens?: number; outputTokens?: number } | undefined;
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await llmClassify(line, hits, ctx.supplierName);
    usage = res.usage;
    const bad = res.out.candidates.filter((c) => !byCode.has(c.hs_code));
    if (bad.length === 0) {
      out = res.out;
      break;
    }
    lastError = `codes not in tariff: ${bad.map((b) => b.hs_code).join(",")}`;
  }
  const hash = promptHash([CLASSIFY_SYSTEM, query, hits.map((h) => h.id)]);
  if (!out) {
    await logAiRun({ organizationId: ctx.organizationId, shipmentId: ctx.shipmentId, purpose: "classify", model: modelName(), promptHash: hash, latencyMs: Date.now() - started, error: lastError }, db);
    throw new Error(`classification rejected after retries: ${lastError}`);
  }

  // 4. Citation check: citation must reference a real excerpt line AND quote must appear in it; else confidence ≤ 0.5
  const candidates: HsCandidate[] = out.candidates.map((c) => {
    const tl = byCode.get(c.hs_code)!;
    const validCitations = c.citations.filter((ci) => {
      const ref = byId.get(ci.tariff_line_id);
      if (!ref) return false;
      const hay = `${ref.descriptionKa} ${ref.descriptionEn} ${ref.headingNotes ?? ""} ${ref.chapterNotes ?? ""}`.toLowerCase();
      return hay.includes(ci.quote.toLowerCase().slice(0, 40));
    });
    const confidence = validCitations.length ? c.confidence : Math.min(c.confidence, 0.5);
    return {
      hs_code: c.hs_code,
      confidence: Number(confidence.toFixed(3)),
      reasoning_ka: c.reasoning_ka,
      citations: validCitations,
      gri_rules: c.gri_rules,
      duty_rate: tl.dutyRate,
      description_ka: tl.descriptionKa,
      why_not_others_ka: c.why_not_others_ka ?? undefined,
    };
  });

  // 5. Memory first (badge "confirmed in N shipments"), still requires human confirmation.
  let source: "ai" | "client_memory" = "ai";
  if (mem) {
    const idx = candidates.findIndex((c) => c.hs_code === mem.hsCode);
    const memLine = byCode.get(mem.hsCode);
    if (memLine) {
      const memCand: HsCandidate =
        idx >= 0
          ? { ...candidates[idx]!, confidence: Math.max(candidates[idx]!.confidence, 0.9) }
          : { hs_code: mem.hsCode, confidence: 0.9, reasoning_ka: `კლიენტის მეხსიერება: ეს პროდუქტი ადრე ${mem.timesConfirmed}-ჯერ დადასტურდა ამ კოდით.`, citations: [{ tariff_line_id: memLine.id, quote: memLine.descriptionKa.split(/\s+/).slice(0, 10).join(" ") }], gri_rules: [], duty_rate: memLine.dutyRate, description_ka: memLine.descriptionKa };
      if (idx >= 0) candidates.splice(idx, 1);
      candidates.unshift(memCand);
      candidates.splice(3);
      source = "client_memory";
    }
  }

  const aiRunId = await logAiRun({
    organizationId: ctx.organizationId,
    shipmentId: ctx.shipmentId,
    purpose: "classify",
    model: modelName(),
    promptHash: hash,
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    latencyMs: Date.now() - started,
    output: { candidates, questions: out.questions_for_user, source },
  }, db);
  return { candidates, questionsForUser: out.questions_for_user, source, memoryTimesConfirmed: mem?.timesConfirmed ?? null, aiRunId, tariffVersionId: ctx.tariffVersionId };
}
