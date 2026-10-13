"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/ui/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SheetNavItem = { id: string; title: string };

/** Sticky mini toolbar for the field sheet: section chips with scroll-spy, print, copy everything. Hidden when printing. */
export function SheetToolbar({ sections, copyAllText }: { sections: SheetNavItem[]; copyAllText: string }) {
  const t = useTranslations("sheet");
  const tc = useTranslations("common");
  const [active, setActive] = React.useState(sections[0]?.id ?? "");

  React.useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (first) setActive(first.target.id);
      },
      { rootMargin: "-130px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <div className="glass no-print shadow-soft sticky top-16 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl p-2">
      <nav aria-label={t("sections")} className="scrollbar-thin -mx-0.5 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-0.5 py-0.5">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={active === s.id ? "true" : undefined}
            onClick={(e) => {
              const el = document.getElementById(s.id);
              if (!el) return;
              e.preventDefault();
              setActive(s.id);
              el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
              history.replaceState(null, "", `#${s.id}`);
            }}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
              active === s.id ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {s.title}
          </a>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-1.5">
        <CopyButton value={copyAllText} label={t("copyAll")} className="h-8" />
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer aria-hidden />
          {tc("print")}
        </Button>
      </div>
    </div>
  );
}
