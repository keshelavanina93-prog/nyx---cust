"use client";

import * as React from "react";
import { Coins, Landmark, Percent, Receipt, ScanSearch, ShieldAlert, Wallet, Wine } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { AnimatedMoney } from "./animated-number";

type Tone = "neutral" | "ok" | "warn" | "danger" | "brand";

export type CalcKpiData = {
  customsValue: string;
  duty: string;
  excise: string;
  vat: string;
  fee: string;
  total: string;
  broker: string;
  penalty: string;
  /** localized value-risk text, e.g. "ნორმაში" or "medium" */
  valueRiskText: string;
  valueRiskTone: Tone;
  valueRiskLevel: string;
};

/** Server-rendered labels (with Explain popovers) and hints keyed by tile. */
export type CalcKpiSlots = {
  customsValue: React.ReactNode;
  fee: React.ReactNode;
  penalty: React.ReactNode;
  feeHint: React.ReactNode;
  brokerHint: React.ReactNode;
  penaltyHint: React.ReactNode;
  valueRiskHint: React.ReactNode;
};

const toneBox: Record<Tone, string> = {
  neutral: "border-border bg-card",
  ok: "border-success/30 bg-success/10",
  warn: "border-warning/35 bg-warning/10",
  danger: "border-danger/30 bg-danger/10",
  brand: "border-primary/30 bg-accent",
};
const toneIcon: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  ok: "bg-success/15 text-success",
  warn: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  brand: "bg-primary/15 text-primary",
};

function Tile({ label, icon, tone = "neutral", hint, index, children }: { label: React.ReactNode; icon: React.ReactNode; tone?: Tone; hint?: React.ReactNode; index: number; children: React.ReactNode }) {
  return (
    <div className={cn("animate-slide-up flex flex-col justify-between gap-2 rounded-xl border p-3.5 shadow-xs", toneBox[tone])} style={{ animationDelay: `${index * 45}ms` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4", toneIcon[tone])} aria-hidden>
          {icon}
        </span>
      </div>
      <div className="num text-xl font-semibold tracking-tight">{children}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function CalcKpis({ data, slots }: { data: CalcKpiData; slots: CalcKpiSlots }) {
  const t = useTranslations("calc");
  const tc = useTranslations("common");
  const parts = [
    { key: "duty", label: t("duty"), value: Number(data.duty), cls: "bg-primary" },
    { key: "excise", label: t("excise"), value: Number(data.excise), cls: "bg-warning" },
    { key: "vat", label: t("vat"), value: Number(data.vat), cls: "bg-info" },
    { key: "fee", label: t("fee"), value: Number(data.fee), cls: "bg-success" },
  ];
  const totalNum = parts.reduce((a, p) => a + p.value, 0) || 1;
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section aria-label={t("kpis")} className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="animate-slide-up relative flex flex-col justify-between gap-4 overflow-hidden border-primary/30 bg-accent p-5 text-accent-foreground shadow-lift lg:row-span-2">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <Wallet className="size-4" aria-hidden />
            {t("totalPayable")}
          </div>
          <div className="relative">
            <AnimatedMoney value={data.total} className="num block text-3xl font-bold tracking-tight sm:text-4xl" />
          </div>
          <div className="relative space-y-2">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-background/60" role="img" aria-label={parts.map((p) => `${p.label}: ${Math.round((p.value / totalNum) * 100)}%`).join(", ")}>
              {parts.map((p) => (
                <span key={p.key} className={cn("h-full transition-[width] duration-700 ease-out first:rounded-l-full last:rounded-r-full", p.cls)} style={{ width: shown ? `${(p.value / totalNum) * 100}%` : "0%" }} />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {parts.map((p) => (
                <li key={p.key} className="flex items-center gap-1.5">
                  <span aria-hidden className={cn("size-2 rounded-full", p.cls)} />
                  <span className="truncate">{p.label}</span>
                  <span className="num ml-auto font-medium">{Math.round((p.value / totalNum) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-3">
          <Tile index={1} label={slots.customsValue} icon={<Coins />}>
            <AnimatedMoney value={data.customsValue} />
          </Tile>
          <Tile index={2} label={t("duty")} icon={<Landmark />}>
            <AnimatedMoney value={data.duty} />
          </Tile>
          <Tile index={3} label={t("excise")} icon={<Wine />}>
            <AnimatedMoney value={data.excise} />
          </Tile>
          <Tile index={4} label={t("vat")} icon={<Percent />}>
            <AnimatedMoney value={data.vat} />
          </Tile>
          <Tile index={5} label={slots.fee} icon={<Receipt />} hint={slots.feeHint}>
            <AnimatedMoney value={data.fee} />
          </Tile>
          <Tile index={6} label={t("broker")} icon={<Wallet />} tone="ok" hint={slots.brokerHint}>
            <AnimatedMoney value={data.broker} />
          </Tile>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Tile index={7} label={slots.penalty} icon={<ShieldAlert />} tone={Number(data.penalty) > 0 ? "warn" : "ok"} hint={slots.penaltyHint ?? tc("indicatorNotLegal")}>
          <AnimatedMoney value={data.penalty} />
        </Tile>
        <Tile index={8} label={t("valueRisk")} icon={<ScanSearch />} tone={data.valueRiskTone} hint={slots.valueRiskHint}>
          <span className="text-base leading-snug">{data.valueRiskText}</span>
        </Tile>
      </div>
    </section>
  );
}
