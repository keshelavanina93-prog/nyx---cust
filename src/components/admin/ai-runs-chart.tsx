"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Segmented } from "./segmented";

export type AiRunsDay = { /** ISO date (Asia/Tbilisi) */ key: string; /** dd.MM */ label: string; runs: number; errors: number };

const RANGES = [7, 14, 30] as const;

/** AI runs per day: bar or line, 7/14/30 day range. Fed with serialized rows from the overview page. */
export function AiRunsChart({ data }: { data: AiRunsDay[] }) {
  const t = useTranslations("admin");
  const reduce = useReducedMotion();
  const [range, setRange] = React.useState<(typeof RANGES)[number]>(14);
  const [type, setType] = React.useState<"bar" | "line">("bar");

  const rows = React.useMemo(() => data.slice(-range), [data, range]);
  const totals = React.useMemo(() => rows.reduce((a, r) => ({ runs: a.runs + r.runs, errors: a.errors + r.errors }), { runs: 0, errors: 0 }), [rows]);

  const common = {
    data: rows,
    margin: { top: 8, right: 8, bottom: 0, left: -12 },
  };
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} interval="preserveStartEnd" minTickGap={14} />
      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
      <Tooltip
        cursor={type === "bar" ? { fill: "var(--muted)", opacity: 0.6 } : { stroke: "var(--border)" }}
        contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
        labelStyle={{ color: "var(--muted-foreground)" }}
        itemStyle={{ color: "var(--popover-foreground)" }}
      />
      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label={t("chartRange")}
          value={range}
          onChange={setRange}
          options={RANGES.map((r) => ({ value: r, label: t("chartDays", { n: r }) }))}
        />
        <Segmented
          label={t("chartType")}
          value={type}
          onChange={setType}
          options={[
            { value: "bar", label: t("chartBars") },
            { value: "line", label: t("chartLine") },
          ]}
        />
      </div>

      {totals.runs === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">{t("chartEmpty")}</div>
      ) : (
        <>
          <div aria-hidden className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {type === "bar" ? (
                <BarChart {...common}>
                  {axes}
                  <Bar dataKey="runs" name={t("chartRuns")} fill="var(--primary)" radius={[4, 4, 0, 0]} isAnimationActive={!reduce} animationDuration={500} />
                  <Bar dataKey="errors" name={t("chartErrors")} fill="var(--danger)" radius={[4, 4, 0, 0]} isAnimationActive={!reduce} animationDuration={500} />
                </BarChart>
              ) : (
                <LineChart {...common}>
                  {axes}
                  <Line
                    type="monotone"
                    dataKey="runs"
                    name={t("chartRuns")}
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--card)", stroke: "var(--primary)", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={!reduce}
                    animationDuration={500}
                  />
                  <Line
                    type="monotone"
                    dataKey="errors"
                    name={t("chartErrors")}
                    stroke="var(--danger)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 3, fill: "var(--card)", stroke: "var(--danger)", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={!reduce}
                    animationDuration={500}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          {/* Screen-reader equivalent of the chart */}
          <p className="sr-only">{t("chartSummary", { runs: totals.runs, errors: totals.errors, n: range })}</p>
          <table className="sr-only">
            <caption>{t("aiRunsPerDay")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("fieldDate")}</th>
                <th scope="col">{t("chartRuns")}</th>
                <th scope="col">{t("chartErrors")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row">{r.label}</th>
                  <td>{r.runs}</td>
                  <td>{r.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
