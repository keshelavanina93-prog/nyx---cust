import * as React from "react";
import { CopyButton } from "@/components/ui/client";
import { cn } from "@/lib/utils";

export type ReceiptRow = {
  key: string;
  label: React.ReactNode;
  /** formatted amount shown on the receipt */
  display: string;
  /** plain value placed on the clipboard */
  copy: string;
  /** big highlighted total row */
  total?: boolean;
};

/** Receipt-style list of amounts with a copy button per line and an optional "copy all". */
export function Receipt({ rows, copyAllText, copyAllLabel, className }: { rows: ReceiptRow[]; copyAllText: string; copyAllLabel: string; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <ul className="rounded-xl border border-dashed border-input bg-muted/40 px-4 py-2">
        {rows.map((r) => (
          <li
            key={r.key}
            className={cn("flex items-center gap-3 border-b border-dashed border-border py-2.5 last:border-b-0", r.total && "-mx-4 rounded-lg border-b-0 bg-accent px-4 py-3")}
          >
            <span className={cn("min-w-0 flex-1 text-sm", r.total ? "font-semibold text-accent-foreground" : "text-muted-foreground")}>{r.label}</span>
            <span className={cn("num whitespace-nowrap text-right font-medium", r.total ? "text-xl font-semibold text-accent-foreground" : "text-base text-foreground")}>{r.display}</span>
            <CopyButton value={r.copy} className="shrink-0" />
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <CopyButton value={copyAllText} label={copyAllLabel} className="h-8 px-3 text-sm" />
      </div>
    </div>
  );
}
