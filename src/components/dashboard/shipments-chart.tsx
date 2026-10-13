"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

export type WeekPoint = { /** ISO date of the week start */ key: string; /** dd.MM */ label: string; count: number };

/** Shipments created per week (area chart). Fed with serialized data from the dashboard page. */
export function ShipmentsChart({ data }: { data: WeekPoint[] }) {
  const t = useTranslations("dashboard");
  const reduce = useReducedMotion();
  const summary = data.map((d) => `${d.label}: ${d.count}`).join(", ");
  return (
    <div role="img" aria-label={`${t("chartLabel")}. ${summary}`} className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="shipments-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} interval="preserveStartEnd" minTickGap={16} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            formatter={(v) => [String(v), t("chartSeries")]}
            contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            itemStyle={{ color: "var(--popover-foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="count"
            name={t("chartSeries")}
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#shipments-area-fill)"
            dot={{ r: 3, fill: "var(--card)", stroke: "var(--primary)", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            isAnimationActive={!reduce}
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
