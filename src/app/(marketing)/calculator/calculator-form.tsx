"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Decimal from "decimal.js";
import { Coins, Landmark, Percent, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Stat } from "@/components/ui/primitives";
import { CopyButton } from "@/components/ui/client";
import { BreakdownChart } from "@/components/marketing/breakdown-chart";
import { formatGel, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Declaration fee tiers by customs value in GEL: [upper bound, fee]. */
export const FEES: [number, number][] = [
  [3000, 50],
  [15000, 150],
  [Infinity, 200],
];

export const DUTY_PRESETS = [0, 5, 12] as const;

export type Landed = { cv: Decimal; d: Decimal; vat: Decimal; fee: Decimal; total: Decimal };

const num = (v: string) => {
  const d = new Decimal(v.trim() === "" ? 0 : v.trim().replace(",", "."));
  if (!d.isFinite() || d.isNegative()) throw new Error("invalid");
  return d;
};

/** (goods + freight) × rate = customs value; duty on it; 18% VAT on value + duty; fee by tier. Returns null on invalid input. */
export function computeLanded(value: string, freight: string, rate: string, duty: string): Landed | null {
  try {
    const cv = num(value).plus(num(freight)).mul(num(rate));
    const d = cv.mul(num(duty)).div(100);
    const vat = cv.plus(d).mul(18).div(100);
    const fee = new Decimal(FEES.find(([max]) => cv.lte(max))![1]);
    return { cv, d, vat, fee, total: d.plus(vat).plus(fee) };
  } catch {
    return null;
  }
}

const toSliderValue = (v: string, min: number, max: number) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

function SliderField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}) {
  const t = useTranslations("calculator");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative w-36">
          <Input id={id} inputMode="decimal" className={cn("num text-right", suffix && "pr-9")} value={value} onChange={(e) => onChange(e.target.value)} />
          {suffix ? <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{suffix}</span> : null}
        </div>
      </div>
      <input
        type="range"
        aria-label={t("slider", { label })}
        min={min}
        max={max}
        step={step}
        value={toSliderValue(value, min, max)}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-full cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
      />
    </div>
  );
}

export function CalculatorForm() {
  const t = useTranslations("calculator");
  const tc = useTranslations("calc");
  const [value, setValue] = React.useState("5000");
  const [freight, setFreight] = React.useState("500");
  const [rate, setRate] = React.useState("2.70");
  const [duty, setDuty] = React.useState("12");
  const r = React.useMemo(() => computeLanded(value, freight, rate, duty), [value, freight, rate, duty]);

  const summary = r
    ? [
        `${t("title")}`,
        `${t("goodsValue")}: ${value}; ${t("freight")}: ${freight}; ${t("rate")}: ${rate}; ${t("dutyRate")}: ${duty}%`,
        `${tc("customsValue")}: ${formatGel(r.cv)}`,
        `${tc("duty")}: ${formatGel(r.d)}`,
        `${tc("vat")}: ${formatGel(r.vat)}`,
        `${tc("fee")}: ${formatGel(r.fee)}`,
        `${tc("totalPayable")}: ${formatGel(r.total)}`,
      ].join("\n")
    : "";
  const burden = r && r.cv.gt(0) ? formatPercent(r.total.div(r.cv).mul(100), 1) : "—";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>{t("inputsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SliderField id="calc-value" label={t("goodsValue")} value={value} onChange={setValue} min={0} max={50000} step={100} />
          <SliderField id="calc-freight" label={t("freight")} value={freight} onChange={setFreight} min={0} max={10000} step={50} />
          <SliderField id="calc-rate" label={t("rate")} value={rate} onChange={setRate} min={1} max={4} step={0.01} />
          <div className="space-y-2">
            <SliderField id="calc-duty" label={t("dutyRate")} value={duty} onChange={setDuty} min={0} max={30} step={0.5} suffix="%" />
            <div role="group" aria-label={t("presets")} className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">{t("presets")}</span>
              {DUTY_PRESETS.map((p) => {
                const pressed = Number(duty.replace(",", ".")) === p;
                return (
                  <Button key={p} size="sm" variant={pressed ? "default" : "secondary"} aria-pressed={pressed} onClick={() => setDuty(String(p))} className="num min-w-12">
                    {p}%
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {r ? (
          <>
            <div className="rounded-xl bg-gradient-to-br from-primary to-info p-5 text-primary-foreground shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-medium opacity-90">{tc("totalPayable")}</div>
                <CopyButton value={summary} label={t("copyResult")} className="h-8" />
              </div>
              <div className="num mt-1 text-4xl font-bold tracking-tight sm:text-5xl" aria-live="polite" aria-atomic="true">
                {formatGel(r.total)}
              </div>
              <div className="mt-2 text-sm opacity-90">
                {t("burden")}: <span className="num font-semibold">{burden}</span>
                <span className="sr-only"> ({t("burdenHint")})</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label={tc("customsValue")} value={formatGel(r.cv)} icon={<Landmark aria-hidden />} />
              <Stat label={tc("duty")} value={formatGel(r.d)} icon={<Percent aria-hidden />} tone="brand" />
              <Stat label={tc("vat")} value={formatGel(r.vat)} icon={<Receipt aria-hidden />} tone="info" />
              <Stat label={tc("fee")} value={formatGel(r.fee)} hint={t("feeHint")} icon={<Coins aria-hidden />} tone="warn" />
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{t("breakdownTitle")}</CardTitle>
                <CardDescription>{t("burdenHint")}</CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownChart
                  ariaLabel={t("chartLabel")}
                  data={[
                    { key: "duty", label: tc("duty"), value: r.d.toNumber(), color: "var(--primary)" },
                    { key: "vat", label: tc("vat"), value: r.vat.toNumber(), color: "var(--info)" },
                    { key: "fee", label: tc("fee"), value: r.fee.toNumber(), color: "var(--warning)" },
                  ]}
                />
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="pt-5 text-sm text-danger" role="alert">
              {t("invalid")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
