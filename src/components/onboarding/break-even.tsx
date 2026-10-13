"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, Scale, TrendingDown } from "lucide-react";
import { Alert, Field, Input, Select, Stat } from "@/components/ui/primitives";
import { AnimatedBar } from "@/components/ui/animated";
import { SubmitButton } from "@/components/ui/client";
import { formatGel } from "@/lib/money";
import { computeBreakEven, type AccessFee } from "./breakeven";

/**
 * Break-even calculator. It is a plain GET form (so the numbers persist in the URL and survive a reload),
 * but the tiles are recomputed on every keystroke on the client.
 */
export function BreakEvenCalculator({ fees, initial }: { fees: AccessFee[]; initial: { n: string; fee: string; term: string } }) {
  const t = useTranslations("onboarding");
  const tw = useTranslations("wizard");
  const [n, setN] = React.useState(initial.n);
  const [fee, setFee] = React.useState(initial.fee);
  const [term, setTerm] = React.useState(initial.term);
  const r = computeBreakEven({ declarations: n, brokerFee: fee, term, fees });
  const worth = r.saving.gt(0);
  const max = Math.max(r.brokerYear.toNumber(), r.accessPerYear.toNumber(), 1);

  return (
    <div className="space-y-4">
      <form method="get" className="grid gap-3 sm:grid-cols-2">
        <Field label={t("declPerYear")}>
          <Input name="n" type="number" min={1} inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} />
        </Field>
        <Field label={t("brokerFee")}>
          <Input name="fee" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
        </Field>
        <Field label={t("term")}>
          <Select name="term" value={term} onChange={(e) => setTerm(e.target.value)}>
            {fees.map((f) => (
              <option key={f.termMonths} value={f.termMonths}>
                {t("months", { n: f.termMonths })} · {formatGel(f.feeGel)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-col justify-end gap-1">
          <SubmitButton variant="secondary">{tw("keepValues")}</SubmitButton>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
        <Stat label={t("brokerYear")} value={formatGel(r.brokerYear)} />
        <Stat label={t("accessFee")} value={formatGel(r.accessPerYear)} hint={t("months", { n: r.term })} />
        <Stat label={t("saving")} value={formatGel(r.saving)} tone={worth ? "ok" : "warn"} hint={t("breakeven", { n: r.breakeven })} />
      </div>

      <div className="space-y-2 rounded-xl border bg-muted/40 p-3 text-xs" aria-hidden>
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-muted-foreground">{tw("barBroker")}</span>
          <AnimatedBar pct={(r.brokerYear.toNumber() / max) * 100} className="h-3 w-full" barClassName="bg-warning" />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-muted-foreground">{tw("barSelf")}</span>
          <AnimatedBar pct={(r.accessPerYear.toNumber() / max) * 100} className="h-3 w-full" barClassName="bg-success" />
        </div>
      </div>

      {worth ? (
        <Alert tone="ok" hideIcon>
          <span className="flex items-start gap-2">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{tw("verdictWorth", { amount: formatGel(r.saving), n: r.breakeven })}</span>
          </span>
        </Alert>
      ) : r.brokerFee.gt(0) ? (
        <Alert tone="warn" hideIcon>
          <span className="flex items-start gap-2">
            <TrendingDown aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{tw("verdictNotYet", { n: r.breakeven })}</span>
          </span>
        </Alert>
      ) : (
        <Alert tone="info" hideIcon>
          <span className="flex items-start gap-2">
            <Scale aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{tw("verdictEnterFee")}</span>
          </span>
        </Alert>
      )}
    </div>
  );
}
