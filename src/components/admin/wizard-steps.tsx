import * as React from "react";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type WizardStep = { id: string; label: string; description?: string };

/** Horizontal numbered stepper with a progress bar. `current` is 0-based; earlier steps are shown as done. */
export function WizardSteps({ steps, current, label, progressLabel }: { steps: WizardStep[]; current: number; label: string; progressLabel: string }) {
  const value = Math.round(((current + 1) / steps.length) * 100);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-muted-foreground">{progressLabel}</span>
        <span className="num font-semibold text-foreground">{value}%</span>
      </div>
      <Progress value={value} aria-label={progressLabel} />
      <ol aria-label={label} className="grid gap-2 sm:grid-cols-3">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={s.id}
              aria-current={active ? "step" : undefined}
              className={cn("flex items-start gap-3 rounded-lg border p-3 transition-colors", active ? "border-primary/40 bg-accent/60" : "bg-card", done && "border-success/30")}
            >
              <span
                aria-hidden
                className={cn(
                  "num flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done ? "border-success bg-success text-success-foreground" : active ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <div className="min-w-0">
                <div className={cn("text-sm font-semibold", !active && !done && "text-muted-foreground")}>{s.label}</div>
                {s.description ? <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
