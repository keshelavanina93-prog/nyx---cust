import * as React from "react";
import { getTranslations } from "next-intl/server";
import { BookOpen, ImageIcon, ListChecks, ListOrdered, StickyNote } from "lucide-react";
import type { GuideBlock } from "@/lib/content/guide";
import { Alert } from "@/components/ui/primitives";
import { GuideAccordion, type GuideSectionView } from "@/components/guide/guide-accordion";

type Section = { title?: string; blocks: GuideBlock[] };

function groupSections(blocks: GuideBlock[]): { intro: GuideBlock[]; sections: Section[] } {
  const intro: GuideBlock[] = [];
  const sections: Section[] = [];
  for (const b of blocks) {
    if (b.type === "h2") sections.push({ title: b.text, blocks: [] });
    else if (sections.length) sections[sections.length - 1]!.blocks.push(b);
    else intro.push(b);
  }
  return { intro, sections };
}

function sectionIcon(blocks: GuideBlock[]) {
  if (blocks.some((b) => b.type === "ol")) return <ListOrdered />;
  if (blocks.some((b) => b.type === "ul")) return <ListChecks />;
  if (blocks.length && blocks.every((b) => b.type === "note")) return <StickyNote />;
  return <BookOpen />;
}

const CAUTION = /\[(UNVERIFIED|ASSUMPTION)\]|დასაზუსტებელია|გადასამოწმებელია/;

async function Blocks({ blocks }: { blocks: GuideBlock[] }) {
  const t = await getTranslations("guide");
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
          case "h3":
            return (
              <h4 key={i} className="pt-1 font-semibold text-foreground">
                {b.text}
              </h4>
            );
          case "p":
            return (
              <p key={i} className="text-foreground/90">
                {b.text}
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="space-y-1.5">
                {b.items?.map((x, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="min-w-0">{x}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {b.items?.map((x, j, arr) => (
                  <li key={j} className="relative flex gap-3 pb-3 last:pb-0">
                    {j < arr.length - 1 ? <span aria-hidden className="absolute bottom-0 left-3 top-6 w-px bg-border" /> : null}
                    <span aria-hidden className="num relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-accent text-xs font-semibold text-accent-foreground">
                      {j + 1}
                    </span>
                    <span className="min-w-0 pt-0.5">{x}</span>
                  </li>
                ))}
              </ol>
            );
          case "note":
            return (
              <Alert key={i} tone={b.text && CAUTION.test(b.text) ? "warn" : "info"} className="py-2.5 text-[13px] leading-relaxed">
                {b.text}
              </Alert>
            );
          case "screenshot":
            return (
              <figure key={i} className="flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-input bg-muted/40 px-4 py-6 text-center text-xs text-muted-foreground">
                <ImageIcon aria-hidden className="size-6" />
                <figcaption>
                  <span className="font-medium">{t("screenshotPlaceholder")}</span>
                  {b.text ? <span className="block opacity-80">{b.text}</span> : null}
                </figcaption>
              </figure>
            );
        }
      })}
    </div>
  );
}

/** Renders guide markdown blocks: h2 sections become numbered, collapsible steps; notes are callouts. */
export async function GuideView({ blocks }: { blocks: GuideBlock[] }) {
  const { intro, sections } = groupSections(blocks);
  const views: GuideSectionView[] = sections.map((s, i) => ({
    id: `s${i}`,
    title: s.title ?? "",
    icon: sectionIcon(s.blocks),
    body: <Blocks blocks={s.blocks} />,
  }));
  return (
    <div className="space-y-4">
      {intro.length ? <Blocks blocks={intro} /> : null}
      {views.length ? <GuideAccordion sections={views} /> : null}
    </div>
  );
}
