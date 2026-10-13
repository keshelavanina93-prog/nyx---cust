"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, FilterX } from "lucide-react";
import { Badge, Card, CardContent, Stat, Table, Td, Th } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FilterChip } from "./segmented";

export type AiPurpose = "extract" | "classify" | "explain";
export type AiRunRow = {
  id: string;
  when: string;
  purpose: AiPurpose;
  /** stored as "provider:model" (or just "mock") */
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  costUsd: string | null;
  error: string | null;
};

const PURPOSES = [
  { value: "extract", label: "purposeExtract" },
  { value: "classify", label: "purposeClassify" },
  { value: "explain", label: "purposeExplain" },
] as const;

function splitModel(model: string): { provider: string; name: string } {
  const i = model.indexOf(":");
  return i === -1 ? { provider: "mock", name: model } : { provider: model.slice(0, i), name: model.slice(i + 1) };
}

function providerTone(provider: string) {
  if (provider === "anthropic") return "brand" as const;
  if (provider === "vertex" || provider === "google" || provider === "google-vertex") return "info" as const;
  return "neutral" as const;
}

export function AiRunsTable({ rows }: { rows: AiRunRow[] }) {
  const t = useTranslations("admin");
  const [purpose, setPurpose] = React.useState<AiPurpose | "all">("all");
  const [errorsOnly, setErrorsOnly] = React.useState(false);

  const filtered = React.useMemo(() => rows.filter((r) => (purpose === "all" || r.purpose === purpose) && (!errorsOnly || r.error)), [rows, purpose, errorsOnly]);
  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.purpose] = (c[r.purpose] ?? 0) + 1;
    return c;
  }, [rows]);
  const stats = React.useMemo(() => {
    const errors = filtered.filter((r) => r.error).length;
    const lat = filtered.filter((r) => r.latencyMs != null);
    const avg = lat.length ? Math.round(lat.reduce((a, r) => a + (r.latencyMs ?? 0), 0) / lat.length) : null;
    const cost = filtered.reduce((a, r) => a + (r.costUsd ? Number(r.costUsd) : 0), 0);
    return { errors, avg, cost };
  }, [filtered]);
  const errorCount = React.useMemo(() => rows.filter((r) => r.error).length, [rows]);
  const filtersActive = purpose !== "all" || errorsOnly;

  return (
    <div className="space-y-4">
      <div role="group" aria-label={t("filters")} className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("filterPurpose")}</span>
        <FilterChip pressed={purpose === "all"} onClick={() => setPurpose("all")}>
          {t("filterAll")}
          <span className="num text-muted-foreground">{counts.all}</span>
        </FilterChip>
        {PURPOSES.map((p) => (
          <FilterChip key={p.value} pressed={purpose === p.value} onClick={() => setPurpose(purpose === p.value ? "all" : p.value)}>
            {t(p.label)}
            <span className="num text-muted-foreground">{counts[p.value] ?? 0}</span>
          </FilterChip>
        ))}
        <span aria-hidden className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <FilterChip pressed={errorsOnly} tone="danger" onClick={() => setErrorsOnly((v) => !v)}>
          <AlertTriangle className="size-3.5" aria-hidden />
          {t("filterErrorsOnly")}
          <span className="num">{errorCount}</span>
        </FilterChip>
        {filtersActive ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPurpose("all");
              setErrorsOnly(false);
            }}
          >
            <FilterX aria-hidden />
            {t("clearFilters")}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("sumRuns")} value={filtered.length} hint={t("shownOf", { shown: filtered.length, total: rows.length })} />
        <Stat label={t("sumErrors")} value={stats.errors} tone={stats.errors > 0 ? "danger" : "neutral"} />
        <Stat label={t("sumLatency")} value={stats.avg == null ? "—" : t("ms", { n: stats.avg })} />
        <Stat label={t("sumCost")} value={`$${stats.cost.toFixed(4)}`} />
      </div>

      <Card>
        <CardContent className="pt-4 sm:pt-5">
          {filtered.length === 0 ? (
            <EmptyState title={t("noRuns")} className="py-10" />
          ) : (
            <Table stickyHeader>
              <thead>
                <tr>
                  <Th>{t("colWhen")}</Th>
                  <Th>{t("colPurpose")}</Th>
                  <Th>{t("colProvider")}</Th>
                  <Th>{t("colModel")}</Th>
                  <Th className="text-right">{t("colTokens")}</Th>
                  <Th className="text-right">{t("colLatency")}</Th>
                  <Th className="text-right">{t("colCost")}</Th>
                  <Th>{t("colError")}</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const { provider, name } = splitModel(r.model);
                  const failed = Boolean(r.error);
                  return (
                    <tr key={r.id} className={cn(failed && "bg-danger/10!")}>
                      <Td className={cn("num whitespace-nowrap text-xs", failed && "shadow-[inset_3px_0_0_var(--danger)]")}>{r.when}</Td>
                      <Td>
                        <Badge>{t(PURPOSES.find((p) => p.value === r.purpose)?.label ?? "purposeExtract")}</Badge>
                      </Td>
                      <Td>
                        <Badge tone={providerTone(provider)}>{provider}</Badge>
                      </Td>
                      <Td className="font-mono text-xs">{name}</Td>
                      <Td className="num whitespace-nowrap text-right text-xs">
                        {r.inputTokens ?? "—"} / {r.outputTokens ?? "—"}
                      </Td>
                      <Td className="num whitespace-nowrap text-right text-xs">{r.latencyMs == null ? "—" : t("ms", { n: r.latencyMs })}</Td>
                      <Td className="num text-right text-xs">{r.costUsd == null ? "—" : Number(r.costUsd).toFixed(4)}</Td>
                      <Td className="max-w-xs break-words text-xs">
                        {failed ? (
                          <span className="inline-flex items-start gap-1.5 font-medium text-danger">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            {r.error}
                          </span>
                        ) : null}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
