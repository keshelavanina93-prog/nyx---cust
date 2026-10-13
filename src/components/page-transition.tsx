"use client";

import * as React from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

/**
 * Fade/slide-in on mount. Pages remount on navigation, so this plays on every route change.
 * Disabled when the user prefers reduced motion. Content stays visible without JS (noscript override).
 */
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <LazyMotion features={domAnimation} strict>
      <noscript>
        <style>{".page-transition{opacity:1!important;transform:none!important}"}</style>
      </noscript>
      <m.div
        className={["page-transition", className].filter(Boolean).join(" ")}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
