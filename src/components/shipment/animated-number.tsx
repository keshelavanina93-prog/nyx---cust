"use client";

import * as React from "react";
import { animate, useReducedMotion } from "motion/react";
import { formatGel } from "@/lib/money";

/**
 * Money value that counts up from 0 on mount (and between values). Server HTML and reduced-motion users get the
 * final value immediately.
 */
export function AnimatedMoney({ value, className, dp = 2, symbol }: { value: string | number; className?: string; dp?: number; symbol?: string }) {
  const reduce = useReducedMotion();
  const fmt = React.useCallback((v: string | number) => formatGel(v, { dp, symbol }), [dp, symbol]);
  const [text, setText] = React.useState(() => fmt(value));
  React.useEffect(() => {
    const target = Number(value);
    if (reduce || !Number.isFinite(target)) {
      setText(fmt(value));
      return;
    }
    const controls = animate(0, target, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setText(fmt(v)),
      onComplete: () => setText(fmt(value)),
    });
    return () => controls.stop();
  }, [value, reduce, fmt]);
  return <span className={className}>{text}</span>;
}
