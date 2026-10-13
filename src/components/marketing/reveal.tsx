"use client";

import * as React from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Fade/slide-up when scrolled into view (plays once). Disabled for `prefers-reduced-motion`.
 * Render `<RevealStyles />` once on the page so content stays visible without JavaScript.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
  eager = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** seconds */
  delay?: number;
  y?: number;
  /** animate on mount instead of waiting for the element to enter the viewport (hero) */
  eager?: boolean;
}) {
  const reduce = useReducedMotion();
  const transition = { duration: reduce ? 0 : 0.55, delay: reduce ? 0 : delay, ease: [0.16, 1, 0.3, 1] as const };
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={cn("reveal", className)}
        initial={reduce ? false : { opacity: 0, y }}
        {...(eager ? { animate: { opacity: 1, y: 0 } } : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "0px 0px -48px 0px" } })}
        transition={transition}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}

/** Server-safe: makes `Reveal` content visible when JavaScript is disabled. */
export function RevealStyles() {
  return (
    <noscript>
      <style>{".reveal{opacity:1!important;transform:none!important}"}</style>
    </noscript>
  );
}
