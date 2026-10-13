import { createAnthropic } from "@ai-sdk/anthropic";
import { createHash } from "node:crypto";
import { getDb, schema, type Db } from "@/db/client";

export function aiIsMock(): boolean {
  return process.env.AI_MOCK === "true" || !process.env.ANTHROPIC_API_KEY;
}

export function modelName(kind: "main" | "fast" = "main"): string {
  if (aiIsMock()) return "mock";
  const m = kind === "fast" ? process.env.ANTHROPIC_MODEL_FAST : process.env.ANTHROPIC_MODEL;
  if (!m) throw new Error(`ANTHROPIC_MODEL${kind === "fast" ? "_FAST" : ""} not set`);
  return m;
}

export function getModel(kind: "main" | "fast" = "main") {
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic(modelName(kind));
}

export function promptHash(parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
}

/** Rough cost estimate; real pricing lives with the provider. Logged for observability only. */
function estimateCost(inputTokens: number, outputTokens: number): string {
  return ((inputTokens * 3 + outputTokens * 15) / 1_000_000).toFixed(6);
}

export async function logAiRun(run: {
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
}, dbOverride?: Db): Promise<string> {
  const db = dbOverride ?? (await getDb());
  const [row] = await db
    .insert(schema.aiRuns)
    .values({
      organizationId: run.organizationId,
      shipmentId: run.shipmentId ?? null,
      purpose: run.purpose,
      model: run.model,
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
