import { getTranslations } from "next-intl/server";
import type { GuideBlock } from "@/lib/content/guide";

export async function GuideView({ blocks }: { blocks: GuideBlock[] }) {
  const t = await getTranslations("guide");
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h3 key={i} className="pt-2 text-base font-semibold">
                {b.text}
              </h3>
            );
          case "h3":
            return (
              <h4 key={i} className="pt-1 font-medium">
                {b.text}
              </h4>
            );
          case "p":
            return <p key={i}>{b.text}</p>;
          case "ul":
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {b.items?.map((x, j) => <li key={j}>{x}</li>)}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal space-y-1 pl-5">
                {b.items?.map((x, j) => <li key={j}>{x}</li>)}
              </ol>
            );
          case "note":
            return (
              <p key={i} className="rounded border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {b.text}
              </p>
            );
          case "screenshot":
            return (
              <div key={i} className="flex h-32 items-center justify-center rounded border border-dashed text-xs text-slate-400">
                {t("screenshotPlaceholder")}: {b.text}
              </div>
            );
        }
      })}
    </div>
  );
}
