"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/primitives";
import { computeLanded, DUTY_PRESETS } from "@/app/(marketing)/calculator/calculator-form";
import { formatGel } from "@/lib/money";

const RATE = "2.70";

/** Live mini landed-cost calculator for the landing hero; links to the full calculator. */
export function LandedCostTeaser() {
  const t = useTranslations("landing");
  const tc = useTranslations("calc");
  const [value, setValue] = React.useState(5000);
  const [duty, setDuty] = React.useState<number>(12);
  const r = React.useMemo(() => computeLanded(String(value), "0", RATE, String(duty)), [value, duty]);
  const rows = r
    ? [
        { label: tc("duty"), v: r.d },
        { label: tc("vat"), v: r.vat },
        { label: tc("fee"), v: r.fee },
      ]
    : [];
  return (
    <div className="glass rounded-2xl p-5 shadow-lift sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">{t("teaserTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("teaserSub")}</p>

      <div className="mt-5 space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="teaser-value">{t("teaserValue")}</Label>
          <output htmlFor="teaser-value" className="num text-sm font-semibold">
            {formatGel(value, { symbol: "", dp: 0 }).trim()}
          </output>
        </div>
        <input
          id="teaser-value"
          type="range"
          min={500}
          max={30000}
          step={500}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="h-5 w-full cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
        />
      </div>

      <div role="group" aria-label={t("teaserDuty")} className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{t("teaserDuty")}</span>
        {DUTY_PRESETS.map((p) => (
          <Button key={p} size="sm" variant={duty === p ? "default" : "secondary"} aria-pressed={duty === p} onClick={() => setDuty(p)} className="num min-w-12">
            {p}%
          </Button>
        ))}
      </div>

      {r ? (
        <div className="mt-5 rounded-xl border bg-card/70 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tc("totalPayable")}</div>
          <div className="num mt-0.5 text-3xl font-bold tracking-tight" aria-live="polite" aria-atomic="true">
            {formatGel(r.total)}
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-sm">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="num font-medium">{formatGel(row.v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">{t("teaserRate", { rate: "2,70" })}</p>
      <Button asChild variant="outline" className="mt-4 w-full">
        <Link href="/calculator">
          {t("teaserOpen")}
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
