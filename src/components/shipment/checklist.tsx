"use client";

import * as React from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ChecklistItem } from "@/db/schema";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

/**
 * Interactive checklist: animated check toggles, progress bar, required markers and optimistic updates.
 * The server action is called in the background; a failure rolls the item back and shows a toast.
 */
export function Checklist({
  checklist,
  canEdit,
  onToggle,
  className,
}: {
  checklist: { id: string; items: ChecklistItem[] };
  canEdit: boolean;
  onToggle: (checklistId: string, key: string, done: boolean) => Promise<void>;
  className?: string;
}) {
  const t = useTranslations("flow");
  const reduce = useReducedMotion();
  const [items, setItems] = React.useState(checklist.items);
  const [pending, setPending] = React.useState<ReadonlySet<string>>(() => new Set());
  // re-sync when the server sends fresh data (state-from-props pattern)
  const [source, setSource] = React.useState(checklist.items);
  if (source !== checklist.items) {
    setSource(checklist.items);
    setItems(checklist.items);
  }

  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const required = items.filter((i) => i.required);
  const requiredLeft = required.filter((i) => !i.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const complete = requiredLeft === 0;

  async function toggle(key: string, next: boolean) {
    if (!canEdit || pending.has(key)) return;
    setItems((cur) => cur.map((i) => (i.key === key ? { ...i, done: next } : i)));
    setPending((p) => new Set(p).add(key));
    try {
      await onToggle(checklist.id, key, next);
      toast.success(t("saved"), { duration: 1500 });
    } catch {
      setItems((cur) => cur.map((i) => (i.key === key ? { ...i, done: !next } : i)));
      toast.error(t("saveFailed"));
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(key);
        return n;
      });
    }
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <div className={className}>
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="num font-medium text-foreground">
              {done}/{total}
            </span>
            <span className={cn("font-medium", complete ? "text-success" : "text-muted-foreground")} aria-live="polite">
              {complete ? t("allRequiredDone") : t("requiredLeft", { n: requiredLeft })}
            </span>
          </div>
          <Progress value={pct} tone={complete ? "success" : "primary"} aria-label={t("progress")} />
        </div>
        <ul className="space-y-1">
          {items.map((i) => {
            const busy = pending.has(i.key);
            return (
              <li key={i.key}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={i.done}
                  disabled={!canEdit}
                  aria-busy={busy || undefined}
                  onClick={() => toggle(i.key, !i.done)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
                    canEdit ? "cursor-pointer hover:bg-muted" : "cursor-default",
                    i.done && "bg-success/5",
                    busy && "opacity-70",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-200",
                      i.done ? "border-success bg-success text-success-foreground" : "border-input bg-card group-hover:border-primary",
                    )}
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                      <m.path
                        d="M3.5 8.5l3 3 6-7"
                        initial={false}
                        animate={{ pathLength: i.done ? 1 : 0, opacity: i.done ? 1 : 0 }}
                        transition={reduce ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
                      />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block transition-colors", i.done && "text-muted-foreground line-through decoration-muted-foreground/50")}>
                      {i.label_ka}
                      {i.required ? (
                        <>
                          <span aria-hidden className="ml-1 font-semibold text-danger">
                            *
                          </span>
                          <span className="sr-only"> ({t("required")})</span>
                        </>
                      ) : null}
                    </span>
                    {i.hint_ka ? <span className="mt-0.5 block text-xs text-muted-foreground">{i.hint_ka}</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {required.length ? (
          <p className="mt-3 text-xs text-muted-foreground">
            <span aria-hidden className="font-semibold text-danger">
              *
            </span>{" "}
            {t("required")}
          </p>
        ) : null}
      </div>
    </LazyMotion>
  );
}
