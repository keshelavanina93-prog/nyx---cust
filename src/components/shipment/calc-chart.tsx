"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { formatGel } from "@/lib/money";

export type ChartRow = { id: string; name: string; hs: string; description: string; duty: number; excise: number; vat: number };

const SERIES = [
  { key: "duty", color: "var(--primary)" },
  { key: "excise", color: "var(--warning)" },
  { key: "vat", color: "var(--info)" },
] as const;

/** Stacked bar: duty / excise / VAT per invoice line. The breakdown table below is the accessible equivalent. */
export function CalcChart({ rows }: { rows: ChartRow[] }) {
  const t = useTranslations("calc");
  const tc = useTranslations("common");
  const reduce = useReducedMotion();
  const label = (k: (typeof SERIES)[number]["key"]) => (k === "duty" ? t("duty") : k === "excise" ? t("excise") : t("vat"));

  return (
    <figure>
      <figcaption className="sr-only">{t("chartCaption")}</figcaption>
      <ul className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {label(s.key)}
          </li>
        ))}
      </ul>
      <div className="h-64 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 256 }}>
          <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickFormatter={(v: number) => formatGel(v, { dp: 0, symbol: "" }).trim()} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={(props) => <ChartTooltip {...props} labels={{ duty: t("duty"), excise: t("excise"), vat: t("vat"), total: tc("total") }} />} />
            {SERIES.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} stackId="tax" fill={s.color} isAnimationActive={!reduce} radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={72} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function ChartTooltip({ active, payload, labels }: Partial<TooltipContentProps> & { labels: Record<"duty" | "excise" | "vat" | "total", string> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]!.payload as ChartRow;
  const total = row.duty + row.excise + row.vat;
  return (
    <div className="max-w-64 rounded-xl border bg-popover p-3 text-xs text-popover-foreground shadow-lift">
      <p className="num font-semibold">
        #{row.name.replace(/^#/, "")} · {row.hs}
      </p>
      <p className="mb-2 line-clamp-2 text-muted-foreground">{row.description}</p>
      <ul className="space-y-1">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-sm" style={{ background: s.color }} />
              {labels[s.key]}
            </span>
            <span className="num font-medium">{formatGel(row[s.key])}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-4 border-t pt-1 font-semibold">
          <span>{labels.total}</span>
          <span className="num">{formatGel(total)}</span>
        </li>
      </ul>
    </div>
  );
}
