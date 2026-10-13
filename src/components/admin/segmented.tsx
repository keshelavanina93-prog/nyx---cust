"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Compact segmented control (single choice, buttons with aria-pressed). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center rounded-lg bg-muted p-0.5 text-xs", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
            o.value === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Toggle chip used for filters. */
export function FilterChip({ pressed, onClick, children, tone = "default" }: { pressed: boolean; onClick: () => void; children: React.ReactNode; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
        pressed
          ? tone === "danger"
            ? "border-danger/40 bg-danger/10 text-danger"
            : "border-primary/40 bg-accent text-accent-foreground"
          : "border-input bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
