"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CheckCheck, ExternalLink, ListChecks, Search, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { HsLine, hsTone, type HsLineProps } from "./hs-line";

export type HsItem = { line: HsLineProps["line"]; decision: HsLineProps["decision"] };

type Filter = "all" | "unconfirmed" | "yellow" | "red";

export function HsWorkspace({
  orgSlug,
  shipmentId,
  items,
  thresholds,
  canEdit,
  rsFees,
  actions,
  classifyAll,
  confirmGreen,
  toCalc,
}: {
  orgSlug: string;
  shipmentId: string;
  items: HsItem[];
  thresholds: { yellow: number; red: number };
  canEdit: boolean;
  rsFees: HsLineProps["rsFees"];
  actions: HsLineProps["actions"];
  classifyAll: () => Promise<void>;
  confirmGreen: () => Promise<void>;
  toCalc: () => Promise<void>;
}) {
  const t = useTranslations("hs");
  const [filter, setFilter] = React.useState<Filter>("all");

  const total = items.length;
  const confirmedN = items.filter((i) => i.decision?.humanConfirmed).length;
  const unconfirmed = total - confirmedN;
  const unconfirmedItems = items.filter((i) => !i.decision?.humanConfirmed);
  const yellowN = unconfirmedItems.filter((i) => hsTone(i.decision, thresholds) === "warn").length;
  const redN = unconfirmedItems.filter((i) => hsTone(i.decision, thresholds) === "danger").length;
  const greenN = unconfirmedItems.filter((i) => hsTone(i.decision, thresholds) === "ok").length;
  const needClassify = items.filter((i) => !i.decision).length;

  const visible = items.filter((i) => {
    if (filter === "all") return true;
    if (i.decision?.humanConfirmed) return false;
    if (filter === "unconfirmed") return true;
    return hsTone(i.decision, thresholds) === (filter === "yellow" ? "warn" : "danger");
  });

  const chips: { key: Filter; label: string; n: number }[] = [
    { key: "all", label: t("filterAll"), n: total },
    { key: "unconfirmed", label: t("filterUnconfirmed"), n: unconfirmed },
    { key: "yellow", label: t("filterYellow"), n: yellowN },
    { key: "red", label: t("filterRed"), n: redN },
  ];

  return (
    <div className="space-y-4">
      <div className="glass shadow-soft sticky top-16 z-20 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl p-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProgressRing done={confirmedN} total={total} label={t("progressLabel", { done: confirmedN, total })} />
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight">{t("title")}</h2>
            <div className="mt-0.5">
              {unconfirmed ? (
                <Badge tone="warn" dot>
                  {t("unconfirmed", { n: unconfirmed })}
                </Badge>
              ) : total ? (
                <Badge tone="ok" dot>
                  {t("allConfirmed")}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        {canEdit ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <form action={classifyAll}>
              <SubmitButton variant={needClassify ? "default" : "secondary"} pendingText={t("classifying")} data-testid="classify">
                <Sparkles aria-hidden />
                {needClassify ? t("classify") : t("reclassify")}
              </SubmitButton>
            </form>
            <form action={confirmGreen}>
              <SubmitButton variant="secondary" disabled={greenN === 0}>
                <CheckCheck aria-hidden />
                {t("confirmAllGreen")}
                {greenN ? <span className="num rounded-full bg-success/15 px-1.5 text-xs text-success">{greenN}</span> : null}
              </SubmitButton>
            </form>
            <form action={toCalc}>
              <SubmitButton variant="success" disabled={unconfirmed > 0 || total === 0} data-testid="to-calc">
                {t("toCalc")}
                <ArrowRight aria-hidden />
              </SubmitButton>
            </form>
          </div>
        ) : (
          <Alert tone="info" className="ml-auto">
            {t("viewerCannot")}
          </Alert>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t("filter")} className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={filter === c.key}
              onClick={() => setFilter(c.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
                filter === c.key ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {c.key === "yellow" ? <span aria-hidden className="size-2 rounded-full bg-warning" /> : c.key === "red" ? <span aria-hidden className="size-2 rounded-full bg-danger" /> : null}
              {c.label}
              <span className={cn("num rounded-full px-1.5 text-[11px]", filter === c.key ? "bg-primary-foreground/20" : "bg-muted")}>{c.n}</span>
            </button>
          ))}
        </div>
        <Link href={`/${orgSlug}/tariff`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline">
          <Search className="size-4" aria-hidden />
          {t("searchTariff")}
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </div>

      {total === 0 ? (
        <EmptyState icon={<ListChecks />} title={t("noLines")} />
      ) : visible.length === 0 ? (
        <EmptyState icon={<ListChecks />} title={t("noMatches")} className="py-8" />
      ) : (
        <div className="space-y-4">
          {visible.map((i) => (
            <HsLine key={i.line.id} orgSlug={orgSlug} shipmentId={shipmentId} line={i.line} decision={i.decision} thresholds={thresholds} canEdit={canEdit} rsFees={rsFees} actions={actions} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Circular progress of confirmed / total lines. */
function ProgressRing({ done, total, label }: { done: number; total: number; label: string }) {
  const size = 48;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = total ? done / total : 0;
  const complete = total > 0 && done === total;
  return (
    <div role="img" aria-label={label} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className={cn("transition-[stroke-dashoffset,stroke] duration-700 ease-out", complete ? "stroke-success" : "stroke-primary")}
        />
      </svg>
      <span className="num absolute inset-0 flex items-center justify-center text-xs font-semibold" aria-hidden>
        {done}/{total}
      </span>
    </div>
  );
}
