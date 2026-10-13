import * as React from "react";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Table, Td, Th } from "@/components/ui/primitives";
import { StatusBadge as Badge } from "./status-badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { pct, type EvalMetric } from "./eval-utils";

/** Pass / fail / no-data badge (icon + text, never colour alone). */
export async function EvalResultBadge({ pass }: { pass: boolean | null }) {
  const t = await getTranslations("admin");
  if (pass == null) {
    return (
      <Badge tone="neutral">
        <MinusCircle className="size-3" aria-hidden />
        {t("notAvailable")}
      </Badge>
    );
  }
  return pass ? (
    <Badge tone="ok" dot>
      <CheckCircle2 className="size-3" aria-hidden />
      {t("pass")}
    </Badge>
  ) : (
    <Badge tone="danger" dot>
      <XCircle className="size-3" aria-hidden />
      {t("fail")}
    </Badge>
  );
}

/** Compact metric table (metric / actual / target / result) used on the overview. */
export async function EvalSummaryTable({ metrics }: { metrics: EvalMetric[] }) {
  const t = await getTranslations("admin");
  return (
    <Table>
      <thead>
        <tr>
          <Th>{t("colMetric")}</Th>
          <Th className="text-right">{t("colActual")}</Th>
          <Th className="text-right">{t("colTarget")}</Th>
          <Th>{t("colResult")}</Th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((m) => (
          <tr key={m.key}>
            <Td className="font-medium">{t(m.labelKey)}</Td>
            <Td className="num text-right">{pct(m.actual)}</Td>
            <Td className="num text-right text-muted-foreground">≥ {pct(m.target)}</Td>
            <Td>
              <EvalResultBadge pass={m.pass} />
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** One target-vs-actual bar. The vertical tick marks the target. */
export async function EvalMetricBar({ metric }: { metric: EvalMetric }) {
  const t = await getTranslations("admin");
  const label = t(metric.labelKey);
  const value = metric.actual == null ? 0 : Math.max(0, Math.min(100, metric.actual * 100));
  const target = Math.max(0, Math.min(100, metric.target * 100));
  const tone = metric.pass == null ? "primary" : metric.pass ? "success" : "danger";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="text-sm font-medium">{label}</div>
        <EvalResultBadge pass={metric.pass} />
      </div>
      <div className="relative pt-1">
        <Progress value={value} tone={tone} className="h-2.5" aria-label={label} aria-valuetext={`${pct(metric.actual)} / ${pct(metric.target)}`} />
        <span aria-hidden className="absolute -top-0.5 bottom-[-2px] w-0.5 rounded-full bg-foreground" style={{ left: `calc(${target}% - 1px)` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className={cn("num font-semibold", metric.pass === false ? "text-danger" : metric.pass ? "text-success" : undefined)}>{t("actualValue", { value: pct(metric.actual) })}</span>
        <span className="num">{t("targetValue", { value: pct(metric.target) })}</span>
      </div>
    </div>
  );
}
