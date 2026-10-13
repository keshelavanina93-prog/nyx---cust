import * as React from "react";
import { cn } from "@/lib/utils";

/** Consistent page title row: title + optional description on the left, actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("no-print mb-5 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow ? <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</div> : null}
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
