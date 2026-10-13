"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

export type Role = "owner" | "member" | "viewer";

/** Segmented control for a member's role. Optimistic: the selection moves at once and rolls back with a toast on failure. */
export function RoleSegmented({
  current,
  actions,
  labels,
  groupLabel,
  success,
  failure,
}: {
  current: Role;
  actions: Record<Role, () => Promise<void>>;
  labels: Record<Role, string>;
  groupLabel: string;
  success: string;
  failure: string;
}) {
  const [value, setValue] = React.useState<Role>(current);
  const [source, setSource] = React.useState<Role>(current);
  const [pending, setPending] = React.useState(false);
  if (source !== current) {
    setSource(current);
    setValue(current);
  }

  async function choose(next: Role) {
    if (next === value || pending) return;
    const prev = value;
    setValue(next);
    setPending(true);
    try {
      await actions[next]();
      toast.success(success);
    } catch {
      setValue(prev);
      toast.error(failure);
    } finally {
      setPending(false);
    }
  }

  const roles: Role[] = ["owner", "member", "viewer"];
  return (
    <div role="radiogroup" aria-label={groupLabel} className={cn("inline-flex rounded-lg bg-muted p-0.5", pending && "opacity-80")}>
      {roles.map((r) => {
        const active = value === r;
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={pending}
            onClick={() => choose(r)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const i = roles.indexOf(value);
              const n = roles[(i + (e.key === "ArrowRight" ? 1 : roles.length - 1)) % roles.length]!;
              void choose(n);
              (e.currentTarget.parentElement?.querySelector(`[data-role="${n}"]`) as HTMLElement | null)?.focus();
            }}
            data-role={r}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 disabled:cursor-wait",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {labels[r]}
          </button>
        );
      })}
    </div>
  );
}
