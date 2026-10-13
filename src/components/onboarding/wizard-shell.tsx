"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import { Check, ChevronDown, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Collapse } from "@/components/guide/collapse";
import { ToastForm } from "@/components/guide/toast-form";
import { cn } from "@/lib/utils";

export type WizardStepState = "done" | "current" | "todo";
export type WizardStepView = {
  id: string;
  title: string;
  description?: React.ReactNode;
  state: WizardStepState;
  /** short text shown in the rail and on the collapsed card, e.g. "ACTIVE · 13.10.2027" */
  summary?: string;
  content?: React.ReactNode;
  /** rendered inside the shared <form> (steps 2-5) */
  inForm?: boolean;
};

/**
 * Vertical step rail + expandable step cards. Cards stay mounted when collapsed, so every field of the
 * shared form is still submitted. Steps that are not finished start expanded.
 */
export function WizardShell({
  steps,
  formAction,
  formFooter,
  className,
}: {
  steps: WizardStepView[];
  /** server action of the shared form; when omitted (read-only role) form steps are summary-only */
  formAction?: (formData: FormData) => Promise<void>;
  /** rendered at the end of the shared form (save button) */
  formFooter?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("wizard");
  const reduce = useReducedMotion();
  const uid = React.useId();
  const expandable = (s: WizardStepView) => s.content != null && (!s.inForm || !!formAction);
  const [open, setOpen] = React.useState<ReadonlySet<string>>(() => new Set(steps.filter((s) => s.state !== "done" && expandable(s)).map((s) => s.id)));

  // when a step becomes done after a save, fold it away and open the one that is now current
  const sig = steps.map((s) => `${s.id}:${s.state}`).join("|");
  const [prevSig, setPrevSig] = React.useState(sig);
  if (prevSig !== sig) {
    const before = new Map(prevSig.split("|").map((p) => p.split(":") as [string, string]));
    setPrevSig(sig);
    setOpen((cur) => {
      const n = new Set(cur);
      for (const s of steps) {
        if (s.state === "done" && before.get(s.id) !== "done") n.delete(s.id);
        if (s.state === "current" && expandable(s)) n.add(s.id);
      }
      return n;
    });
  }

  const doneCount = steps.filter((s) => s.state === "done").length;
  const current = steps.find((s) => s.state === "current");
  const toggle = (id: string) =>
    setOpen((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const goTo = (s: WizardStepView) => {
    if (expandable(s)) setOpen((cur) => new Set(cur).add(s.id));
    requestAnimationFrame(() => document.getElementById(`${uid}-${s.id}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  };

  const card = (s: WizardStepView, idx: number) => {
    const can = expandable(s);
    const isOpen = can && open.has(s.id);
    const bodyId = `${uid}-${s.id}-body`;
    return (
      <section
        key={s.id}
        id={`${uid}-${s.id}`}
        aria-labelledby={`${uid}-${s.id}-title`}
        className={cn("scroll-mt-24 overflow-hidden rounded-xl border bg-card shadow-soft transition-shadow", s.state === "current" && "border-primary/50 shadow-lift", s.state === "done" && "border-success/30")}
      >
        <h3 id={`${uid}-${s.id}-title`}>
          <button
            type="button"
            disabled={!can}
            aria-expanded={can ? isOpen : undefined}
            aria-controls={can ? bodyId : undefined}
            onClick={() => toggle(s.id)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors enabled:hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/35 sm:px-5"
          >
            <StepDot n={idx + 1} state={s.state} />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold leading-tight">{s.title}</span>
              {!isOpen && s.summary ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{s.summary}</span> : null}
            </span>
            <span
              className={cn(
                "hidden shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium sm:inline-block",
                s.state === "done" && "border-success/25 bg-success/10 text-success",
                s.state === "current" && "border-primary/25 bg-accent text-accent-foreground",
                s.state === "todo" && "border-border bg-muted text-muted-foreground",
              )}
            >
              {t(s.state)}
            </span>
            {can ? <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} /> : <Lock aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
          </button>
        </h3>
        {can ? (
          <Collapse open={isOpen} id={bodyId}>
            <div className="space-y-3 border-t px-4 py-4 sm:px-5">
              {s.description ? <div className="text-sm text-muted-foreground">{s.description}</div> : null}
              {s.content}
            </div>
          </Collapse>
        ) : null}
      </section>
    );
  };

  // group consecutive form steps so they share one <form>
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]!;
    if (s.inForm && formAction) {
      const group: React.ReactNode[] = [];
      const start = i;
      while (i < steps.length && steps[i]!.inForm) {
        group.push(card(steps[i]!, i));
        i++;
      }
      i--;
      nodes.push(
        <ToastForm key={`form-${start}`} action={formAction} success={t("saved")} failure={t("saveFailed")} className="space-y-3">
          {group}
          {formFooter}
        </ToastForm>,
      );
    } else {
      nodes.push(card(s, i));
    }
  }

  return (
    <div className={cn("grid gap-5 lg:grid-cols-[13.5rem_minmax(0,1fr)]", className)}>
      {/* compact progress on small screens */}
      <div className="space-y-1.5 lg:hidden">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">{t("stepOf", { current: (current ? steps.indexOf(current) : steps.length - 1) + 1, total: steps.length })}</span>
          <span className="num text-muted-foreground">{t("progress", { done: doneCount, total: steps.length })}</span>
        </div>
        <Progress value={Math.round((doneCount / steps.length) * 100)} tone="success" aria-label={t("railTitle")} />
      </div>

      <nav aria-label={t("railTitle")} className="hidden lg:block">
        <div className="sticky top-20 space-y-3">
          <div className="space-y-1.5 px-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">{t("railTitle")}</span>
              <span className="num text-muted-foreground">
                {doneCount}/{steps.length}
              </span>
            </div>
            <Progress value={Math.round((doneCount / steps.length) * 100)} tone="success" className="h-1.5" aria-label={t("railTitle")} />
          </div>
          <ol className="relative">
            {steps.map((s, idx) => (
              <li key={s.id} className="relative">
                {idx < steps.length - 1 ? <span aria-hidden className={cn("absolute bottom-0 left-[1.4rem] top-9 w-0.5 -translate-x-1/2 rounded-full", s.state === "done" ? "bg-success/60" : "bg-border")} /> : null}
                <button
                  type="button"
                  onClick={() => goTo(s)}
                  aria-current={s.state === "current" ? "step" : undefined}
                  className="relative flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
                >
                  <StepDot n={idx + 1} state={s.state} small />
                  <span className="min-w-0 pb-2 pt-0.5">
                    <span className={cn("block text-sm leading-snug", s.state === "current" ? "font-semibold text-foreground" : s.state === "done" ? "font-medium text-foreground" : "text-muted-foreground")}>{s.title}</span>
                    {s.summary ? <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{s.summary}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <div className="min-w-0 space-y-3">{nodes}</div>
    </div>
  );
}

function StepDot({ n, state, small = false }: { n: number; state: WizardStepState; small?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "num relative z-[1] flex shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
        small ? "size-7" : "size-8",
        state === "done" && "border-success bg-success text-success-foreground",
        state === "current" && "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15",
        state === "todo" && "border-border bg-card text-muted-foreground",
      )}
    >
      {state === "done" ? <Check className="size-4" /> : n}
    </span>
  );
}
