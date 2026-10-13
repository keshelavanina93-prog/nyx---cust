"use client";

import * as React from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Horizontal bar whose width animates from 0 to `pct` on mount and between values. */
export function AnimatedBar({ pct, className, barClassName }: { pct: number; className?: string; barClassName?: string }) {
  const reduce = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <LazyMotion features={domAnimation} strict>
      <div className={cn("h-2 w-24 overflow-hidden rounded-full bg-muted", className)}>
        <m.div
          className={cn("h-full rounded-full", barClassName)}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20, mass: 0.8 }}
        />
      </div>
    </LazyMotion>
  );
}

/** Confidence meter with a localized accessible name. Used by `ConfidenceBar`. */
export function ConfidenceMeter({ value, yellow, red, className }: { value: number; yellow: number; red: number; className?: string }) {
  const t = useTranslations("shell");
  const pct = Math.round(value * 100);
  const tone = value < red ? "bg-danger" : value < yellow ? "bg-warning" : "bg-success";
  return (
    <div className={cn("flex items-center gap-2", className)} role="img" aria-label={`${t("confidence")} ${pct}%`}>
      <AnimatedBar pct={pct} barClassName={tone} />
      <span className="num text-xs text-muted-foreground" aria-hidden>
        {pct}%
      </span>
    </div>
  );
}
