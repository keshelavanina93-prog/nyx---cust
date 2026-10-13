import { createAnthropic } from "@ai-sdk/anthropic";
import { createVertexAnthropic } from "@ai-sdk/google-vertex/anthropic";
import { createVertex } from "@ai-sdk/google-vertex";
import { createHash } from "node:crypto";
import { getDb, schema, type Db } from "@/db/client";

/**
 * AI provider selection (AI_PROVIDER):
 * - "vertex"        → Claude on Google Vertex AI (GCP credits; needs per-model quota granted by Google).
 * - "vertex-gemini" → Gemini on Google Vertex AI (GCP credits; available immediately in a new project).
 * - "anthropic"     → Anthropic API directly (ANTHROPIC_API_KEY).
 * - AI_MOCK=true or no credentials → deterministic mock (fixtures).
 * Model ids are never hardcoded: AI_MODEL / AI_MODEL_FAST (fallback ANTHROPIC_MODEL / ANTHROPIC_MODEL_FAST).
 */
export type AiProvider = "vertex" | "vertex-gemini" | "anthropic";

export function aiProvider(): AiProvider {
  const p = process.env.AI_PROVIDER;
  return p === "vertex" || p === "vertex-gemini" ? p : "anthropic";
}

export function aiIsMock(): boolean {
  if (process.env.AI_MOCK === "true") return true;
  if (aiProvider() !== "anthropic") return !process.env.GOOGLE_VERTEX_PROJECT;
  return !process.env.ANTHROPIC_API_KEY;
}

export type ModelKind = "main" | "fast" | "classify";

export function modelName(kind: ModelKind = "main"): string {
  if (aiIsMock()) return "mock";
  const m =
    kind === "fast"
      ? (process.env.AI_MODEL_FAST ?? process.env.ANTHROPIC_MODEL_FAST)
      : kind === "classify"
        ? (process.env.AI_CLASSIFY_MODEL ?? process.env.AI_MODEL ?? process.env.ANTHROPIC_MODEL)
        : (process.env.AI_MODEL ?? process.env.ANTHROPIC_MODEL);
  if (!m) throw new Error(`AI_MODEL${kind === "fast" ? "_FAST" : ""} not set`);
  return m;
}

export function getModel(kind: ModelKind = "main") {
  return getModelById(modelName(kind));
}

/** Resolve a concrete model id on the configured provider (also used for benchmarking overrides). */
export function getModelById(id: string) {
  const provider = aiProvider();
  if (provider === "vertex") {
    const vertex = createVertexAnthropic({ project: process.env.GOOGLE_VERTEX_PROJECT, location: process.env.GOOGLE_VERTEX_LOCATION ?? "global" });
    return vertex(id);
  }
  if (provider === "vertex-gemini") {
    const vertex = createVertex({ project: process.env.GOOGLE_VERTEX_PROJECT, location: process.env.GOOGLE_VERTEX_LOCATION ?? "global" });
    return vertex(id);
  }
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic(id);
}

/** Provider options for classification calls: Gemini thinking budget (AI_CLASSIFY_THINKING_BUDGET, tokens; 0 = off). */
export function classifyProviderOptions(override?: number): Record<string, Record<string, unknown>> | undefined {
  if (aiProvider() !== "vertex-gemini") return undefined;
  const raw = override ?? (process.env.AI_CLASSIFY_THINKING_BUDGET ? Number(process.env.AI_CLASSIFY_THINKING_BUDGET) : undefined);
  if (raw === undefined || Number.isNaN(raw)) return undefined;
  return { google: { thinkingConfig: { thinkingBudget: raw } } };
}

export function promptHash(parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
}

/** Rough cost estimate; real pricing lives with the provider. Logged for observability only. */
function estimateCost(inputTokens: number, outputTokens: number): string {
  return ((inputTokens * 3 + outputTokens * 15) / 1_000_000).toFixed(6);
}

export async function logAiRun(
  run: {
    organizationId: string | null;
    shipmentId?: string | null;
    purpose: "extract" | "classify" | "explain";
    model: string;
    promptHash: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs: number;
    output?: unknown;
    error?: string | null;
  },
  dbOverride?: Db,
): Promise<string> {
  const db = dbOverride ?? (await getDb());
  const [row] = await db
    .insert(schema.aiRuns)
    .values({
      organizationId: run.organizationId,
      shipmentId: run.shipmentId ?? null,
      purpose: run.purpose,
      model: `${aiIsMock() ? "" : aiProvider() + ":"}${run.model}`,
      promptHash: run.promptHash,
      inputTokens: run.inputTokens ?? null,
      outputTokens: run.outputTokens ?? null,
      latencyMs: run.latencyMs,
      costUsd: run.inputTokens != null ? estimateCost(run.inputTokens, run.outputTokens ?? 0) : null,
      output: (run.output ?? null) as never,
      error: run.error ?? null,
    })
    .returning({ id: schema.aiRuns.id });
  return row!.id;
}
