"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { cn } from "@/lib/utils";

/** Prominent "Extract with AI" call-to-action. Shows a stepwise progress hint while the server action runs. */
export function ExtractCta({ action, disabled, hasInvoice }: { action: () => Promise<void>; disabled: boolean; hasInvoice: boolean }) {
  const t = useTranslations("shipment");
  return (
    <form action={action}>
      <Card className={cn("relative overflow-hidden", !disabled && "border-primary/40")}>
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/10 blur-2xl" />
        <CardContent className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="font-semibold leading-tight">{t("extractTitle")}</p>
              <p className="text-sm text-muted-foreground">{hasInvoice ? t("extractReady") : t("extractNeedInvoice")}</p>
              <Steps />
            </div>
          </div>
          <SubmitButton size="lg" disabled={disabled} pendingText={t("extracting")} data-testid="extract" className="shrink-0">
            <Sparkles aria-hidden />
            {t("extract")}
          </SubmitButton>
        </CardContent>
      </Card>
    </form>
  );
}

/** Fake-but-honest staged progress: purely visual, advances while the action is pending. */
function Steps() {
  const t = useTranslations("shipment");
  const { pending } = useFormStatus();
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    if (!pending) {
      setStep(0);
      return;
    }
    const id = setInterval(() => setStep((s) => Math.min(s + 1, 2)), 2200);
    return () => clearInterval(id);
  }, [pending]);
  if (!pending) return null;
  const labels = [t("extractStep1"), t("extractStep2"), t("extractStep3")];
  return (
    <ol className="space-y-1 pt-1 text-xs" aria-live="polite">
      {labels.map((l, i) => (
        <li key={l} className={cn("flex items-center gap-2 transition-opacity", i > step ? "opacity-40" : "opacity-100")}>
          {i < step ? <Check className="size-3.5 text-success" aria-hidden /> : <span aria-hidden className={cn("size-1.5 rounded-full", i === step ? "animate-pulse bg-primary" : "bg-muted-foreground")} />}
          {l}
        </li>
      ))}
    </ol>
  );
}
