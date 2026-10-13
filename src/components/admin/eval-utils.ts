/** Helpers for reading the free-form `eval_results.summary` JSON written by `pnpm eval`. Server/client safe. */

export const EVAL_METRICS = [
  { key: "field_accuracy", labelKey: "mFieldAccuracy", defaultTarget: 0.95 },
  { key: "hs_top3", labelKey: "mHsTop3", defaultTarget: 0.85 },
  { key: "code_in_tariff", labelKey: "mCodeInTariff", defaultTarget: 1 },
  { key: "citation_or_capped", labelKey: "mCitation", defaultTarget: 0.95 },
] as const;

export type EvalMetricKey = (typeof EVAL_METRICS)[number]["key"];
export type EvalMetricLabelKey = (typeof EVAL_METRICS)[number]["labelKey"];

export type EvalMetric = {
  key: EvalMetricKey;
  labelKey: EvalMetricLabelKey;
  /** 0..1 or null when the run had nothing to measure */
  actual: number | null;
  target: number;
  /** null = no data */
  pass: boolean | null;
};

export type EvalMeta = {
  mock: boolean;
  fixtures: number | null;
  hsLines: number | null;
  totalMs: number | null;
  tariff: string | null;
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export function parseEvalSummary(summary: unknown): { metrics: EvalMetric[]; meta: EvalMeta; failed: number } {
  const s = (summary && typeof summary === "object" ? summary : {}) as Record<string, unknown>;
  const targets = (s.targets && typeof s.targets === "object" ? s.targets : {}) as Record<string, unknown>;
  const metrics = EVAL_METRICS.map<EvalMetric>((m) => {
    const actual = num(s[m.key]);
    const target = num(targets[m.key]) ?? m.defaultTarget;
    return { key: m.key, labelKey: m.labelKey, actual, target, pass: actual == null ? null : actual + 1e-9 >= target };
  });
  const meta: EvalMeta = {
    mock: s.mock === true,
    fixtures: num(s.fixtures),
    hsLines: num(s.hs_lines),
    totalMs: num(s.total_ms),
    tariff: typeof s.tariff === "string" ? s.tariff : null,
  };
  return { metrics, meta, failed: metrics.filter((m) => m.pass === false).length };
}

/** 0.9567 -> "95.7%" (no trailing ".0") */
export function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Math.round(v * 1000) / 10}%`;
}
