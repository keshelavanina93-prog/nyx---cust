"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Collapse } from "./collapse";
import { cn } from "@/lib/utils";

export type GuideSectionView = { id: string; title: string; icon: React.ReactNode; body: React.ReactNode };

/** Numbered, collapsible list of guide sections. Everything starts expanded so nothing is hidden by default. */
export function GuideAccordion({ sections, className }: { sections: GuideSectionView[]; className?: string }) {
  const t = useTranslations("flow");
  const uid = React.useId();
  const [open, setOpen] = React.useState<ReadonlySet<string>>(() => new Set(sections.map((s) => s.id)));
  const allOpen = open.size === sections.length;
  const toggle = (id: string) =>
    setOpen((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className={cn("space-y-3", className)}>
      {sections.length > 1 ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(allOpen ? new Set() : new Set(sections.map((s) => s.id)))}
            className="no-print inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
          >
            {allOpen ? <ChevronsDownUp className="size-3.5" aria-hidden /> : <ChevronsUpDown className="size-3.5" aria-hidden />}
            {allOpen ? t("guideCollapseAll") : t("guideExpandAll")}
          </button>
        </div>
      ) : null}
      <ol className="space-y-3">
        {sections.map((s, idx) => {
          const isOpen = open.has(s.id);
          const panelId = `${uid}-${s.id}`;
          return (
            <li key={s.id} className="overflow-hidden rounded-xl border bg-card shadow-xs">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(s.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/35"
                >
                  <span aria-hidden className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {idx + 1}
                  </span>
                  <span aria-hidden className="shrink-0 text-muted-foreground [&_svg]:size-4">
                    {s.icon}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">{s.title}</span>
                  <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} />
                </button>
              </h3>
              <Collapse open={isOpen} id={panelId}>
                <div className="border-t px-4 py-4 text-sm leading-relaxed">{s.body}</div>
              </Collapse>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
