"use client";

import * as React from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { formatGel } from "@/lib/money";

export type BreakdownDatum = { key: string; label: string; value: number; /** any CSS colour, e.g. `var(--primary)` */ color: string };

const money = (v: unknown) => formatGel(Number(v) || 0);

/** Horizontal bars (duty / VAT / fee). Colours come from the theme tokens so it follows light and dark mode. */
export function BreakdownChart({ data, ariaLabel, height = 176 }: { data: BreakdownDatum[]; ariaLabel: string; height?: number }) {
  const reduce = useReducedMotion();
  return (
    <div role="img" aria-label={`${ariaLabel}: ${data.map((d) => `${d.label} ${money(d.value)}`).join(", ")}`} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 88, bottom: 4, left: 0 }} barCategoryGap={14}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="label" width={92} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            formatter={(v) => money(v)}
            contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            itemStyle={{ color: "var(--popover-foreground)" }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={!reduce} animationDuration={450}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
            <LabelList dataKey="value" position="right" formatter={money} fill="var(--foreground)" fontSize={12} className="num" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
