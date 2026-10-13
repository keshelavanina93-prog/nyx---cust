"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, CircleCheck, Eye, FileSearch, FileText, HelpCircle, Info, ScanSearch, ShieldAlert, TriangleAlert, Scale } from "lucide-react";
import { SubmitButton } from "@/components/ui/client";
import { Collapse } from "./collapse";
import { ToastForm } from "./toast-form";
import { cn } from "@/lib/utils";

type Corridor = "green" | "blue" | "yellow" | "red";
type RedReason = "physical" | "value" | "documents" | "unknown";

const CORRIDORS: { key: Corridor; icon: React.ComponentType<{ className?: string }>; tile: string; checked: string; dot: string }[] = [
  { key: "green", icon: CircleCheck, tile: "hover:border-success/60", checked: "peer-checked:border-success peer-checked:bg-success/10 peer-focus-visible:ring-success/40", dot: "bg-success text-success-foreground" },
  { key: "blue", icon: Info, tile: "hover:border-info/60", checked: "peer-checked:border-info peer-checked:bg-info/10 peer-focus-visible:ring-info/40", dot: "bg-info text-info-foreground" },
  { key: "yellow", icon: TriangleAlert, tile: "hover:border-warning/60", checked: "peer-checked:border-warning peer-checked:bg-warning/10 peer-focus-visible:ring-warning/40", dot: "bg-warning text-warning-foreground" },
  { key: "red", icon: ShieldAlert, tile: "hover:border-danger/60", checked: "peer-checked:border-danger peer-checked:bg-danger/10 peer-focus-visible:ring-danger/40", dot: "bg-danger text-danger-foreground" },
];

const REASONS: { key: RedReason; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "physical", icon: ScanSearch },
  { key: "value", icon: Scale },
  { key: "documents", icon: FileSearch },
  { key: "unknown", icon: HelpCircle },
];

/**
 * Corridor picker: four large selectable tiles (native radios, so arrow keys work) that drive a visually-hidden
 * <select name="corridor" data-testid="corridor"> - the form payload (and e2e) stay exactly the same as a plain select.
 * The red-reason chooser only opens for red.
 */
export function CorridorChooser({
  action,
  initialCorridor,
  initialRedReason,
}: {
  action: (formData: FormData) => Promise<void>;
  initialCorridor: Corridor | null;
  initialRedReason: RedReason | null;
}) {
  const t = useTranslations("guide");
  const tf = useTranslations("flow");
  const [corridor, setCorridor] = React.useState<Corridor>(initialCorridor ?? "green");
  const [reason, setReason] = React.useState<RedReason>(initialRedReason ?? "unknown");
  const hints: Record<Corridor, string> = { green: tf("corridorHintGreen"), blue: tf("corridorHintBlue"), yellow: tf("corridorHintYellow"), red: tf("corridorHintRed") };
  const reasonHints: Record<RedReason, string> = { physical: tf("reasonHintPhysical"), value: tf("reasonHintValue"), documents: tf("reasonHintDocuments"), unknown: tf("reasonHintUnknown") };

  return (
    <ToastForm action={action} success={tf("corridorSaved")} failure={tf("saveFailed")} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="sr-only">{t("corridor")}</legend>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {CORRIDORS.map((c) => {
            const Icon = c.icon;
            return (
              <label key={c.key} className="relative block cursor-pointer">
                <input type="radio" name="corridorChoice" value={c.key} checked={corridor === c.key} onChange={() => setCorridor(c.key)} className="peer sr-only" />
                <span
                  className={cn(
                    "flex h-full flex-col gap-2 rounded-xl border-2 border-border bg-card p-3 shadow-xs transition-[border-color,background-color,box-shadow,transform] duration-200 active:scale-[0.98] peer-focus-visible:ring-3 peer-checked:shadow-soft",
                    c.tile,
                    c.checked,
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span aria-hidden className={cn("flex size-8 items-center justify-center rounded-full", c.dot)}>
                      <Icon className="size-4" />
                    </span>
                    <span
                      aria-hidden
                      className={cn("flex size-5 items-center justify-center rounded-full border-2 transition-all", corridor === c.key ? "scale-100 border-foreground bg-foreground text-background" : "scale-90 border-input text-transparent")}
                    >
                      <Check className="size-3" />
                    </span>
                  </span>
                  <span className="text-sm font-semibold leading-tight">{t(c.key)}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{hints[c.key]}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* the real form control: kept in sync with the tiles, hidden visually but still operable by tests / AT */}
      <select name="corridor" data-testid="corridor" value={corridor} onChange={(e) => setCorridor(e.target.value as Corridor)} className="sr-only" tabIndex={-1} aria-label={t("corridor")}>
        {CORRIDORS.map((c) => (
          <option key={c.key} value={c.key}>
            {t(c.key)}
          </option>
        ))}
      </select>

      <Collapse open={corridor === "red"}>
        <fieldset className="space-y-2 rounded-xl border border-danger/30 bg-danger/5 p-3">
          <legend className="px-1 text-sm font-semibold text-danger">{t("redReason")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {REASONS.map((r) => {
              const Icon = r.icon;
              return (
                <label key={r.key} className="relative block cursor-pointer">
                  <input type="radio" name="redReason" value={r.key} checked={reason === r.key} onChange={() => setReason(r.key)} className="peer sr-only" />
                  <span className="flex items-start gap-2.5 rounded-lg border-2 border-transparent bg-card px-3 py-2 text-sm shadow-xs transition-colors hover:border-danger/40 peer-checked:border-danger peer-checked:bg-danger/10 peer-focus-visible:ring-3 peer-focus-visible:ring-danger/40">
                    <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
                    <span className="min-w-0">
                      <span className="block font-medium leading-tight">{t(r.key)}</span>
                      <span className="block text-xs text-muted-foreground">{reasonHints[r.key]}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Collapse>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton data-testid="save-corridor">
          <Eye aria-hidden />
          {t("saveCorridor")}
        </SubmitButton>
        {!initialCorridor ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText aria-hidden className="size-3.5" />
            {tf("corridorNotRecorded")}
          </span>
        ) : null}
      </div>
    </ToastForm>
  );
}
