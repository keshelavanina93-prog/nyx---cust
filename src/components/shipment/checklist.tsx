"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { ChecklistItem } from "@/db/schema";

export function Checklist({ checklist, canEdit, onToggle }: { checklist: { id: string; items: ChecklistItem[] }; canEdit: boolean; onToggle: (checklistId: string, key: string, done: boolean) => Promise<void> }) {
  const tc = useTranslations("common");
  const [pending, start] = React.useTransition();
  const done = checklist.items.filter((i) => i.done).length;
  return (
    <div>
      <div className="mb-2 text-xs text-slate-500">
        {done}/{checklist.items.length} {tc("done").toLowerCase()}
      </div>
      <ul className="space-y-1">
        {checklist.items.map((i) => (
          <li key={i.key} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" checked={i.done} disabled={!canEdit || pending} onChange={(e) => start(() => onToggle(checklist.id, i.key, e.target.checked))} aria-label={i.label_ka} />
            <span className={i.done ? "text-slate-500 line-through" : ""}>
              {i.label_ka}
              {i.required ? <span className="ml-1 text-red-600">*</span> : null}
              {i.hint_ka ? <span className="ml-1 text-xs text-slate-400">{i.hint_ka}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
