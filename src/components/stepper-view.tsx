"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutGroup, LazyMotion, m, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepView = {
  key: string;
  label: string;
  href: string;
  state: "done" | "current" | "available" | "locked";
  enabled: boolean;
};

// layout animations (layoutId) need the larger feature bundle; load it lazily so it never blocks hydration
const loadFeatures = () => import("motion/react").then((mod) => mod.domMax);

/** Horizontal stepper: progress line, animated active ring (layoutId), check icons for done steps. */
export function StepperView({ steps, currentIndex, reachedIndex, label }: { steps: StepView[]; currentIndex: number; reachedIndex: number; label: string }) {
  const reduce = useReducedMotion();
  const scroller = React.useRef<HTMLDivElement>(null);
  const currentRef = React.useRef<HTMLLIElement>(null);
  // keep the current step visible when the list scrolls horizontally (mobile)
  React.useEffect(() => {
    const box = scroller.current;
    const el = currentRef.current;
    if (!box || !el) return;
    const left = el.offsetLeft - (box.clientWidth - el.clientWidth) / 2;
    box.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
  }, [currentIndex, reduce]);

  return (
    <LazyMotion features={loadFeatures} strict>
      <nav aria-label={label} className="no-print -mx-4 sm:mx-0">
        <div ref={scroller} className="scrollbar-thin overflow-x-auto px-4 pb-2 pt-1 sm:px-1">
          <LayoutGroup id="stepper">
            <ol className="relative flex min-w-max items-start">
              {steps.map((s, i) => {
                const filled = i < reachedIndex; // connector after this step is "done"
                const isCurrent = s.state === "current";
                const circle = (
                  <span className="relative flex size-9 items-center justify-center">
                    {isCurrent ? (
                      <m.span
                        layoutId="step-ring"
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-primary/15 ring-2 ring-primary/40"
                        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 420, damping: 28 }}
                      />
                    ) : null}
                    <span
                      className={cn(
                        "relative flex size-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                        isCurrent && "border-primary bg-primary text-primary-foreground shadow-sm",
                        s.state === "done" && "border-success bg-success text-success-foreground",
                        s.state === "available" && "border-primary bg-card text-primary",
                        s.state === "locked" && "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {s.state === "done" ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <span className="num">{i + 1}</span>}
                    </span>
                  </span>
                );
                const text = (
                  <span
                    className={cn(
                      "max-w-24 text-center text-xs font-medium leading-tight",
                      isCurrent ? "text-foreground" : s.state === "locked" ? "text-muted-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                );
                return (
                  <li key={s.key} ref={isCurrent ? currentRef : undefined} className="flex items-start">
                    {s.enabled ? (
                      <Link
                        href={s.href}
                        aria-current={isCurrent ? "step" : undefined}
                        className="group flex w-20 flex-col items-center gap-1 rounded-lg px-1 py-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
                      >
                        {circle}
                        {text}
                      </Link>
                    ) : (
                      <span aria-disabled="true" className="flex w-20 cursor-not-allowed flex-col items-center gap-1 px-1 py-1">
                        {circle}
                        {text}
                      </span>
                    )}
                    {i < steps.length - 1 ? (
                      <span aria-hidden className="relative mt-[22px] h-0.5 w-6 shrink-0 overflow-hidden rounded-full bg-border sm:w-8">
                        <m.span
                          className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-success"
                          initial={reduce ? false : { scaleX: 0 }}
                          animate={{ scaleX: filled ? 1 : 0 }}
                          transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </LayoutGroup>
        </div>
      </nav>
    </LazyMotion>
  );
}
