import * as React from "react";
import { getTranslations } from "next-intl/server";
import { Check, FileOutput, FilePlus2, Hash, Lock, PackageCheck, Route, ScanText, ShieldCheck, Upload, Wallet } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buildTimeline, type TimelineInput, type TimelineKey } from "./timeline-model";

const ICONS: Record<TimelineKey, React.ComponentType<{ className?: string }>> = {
  created: FilePlus2,
  extracted: ScanText,
  approved: ShieldCheck,
  exported: FileOutput,
  imported: Upload,
  assessed: Hash,
  paid: Wallet,
  corridor: Route,
  released: PackageCheck,
  closed: Lock,
};

/** Vertical timeline: created -> extracted -> approved -> exported -> imported -> assessed -> paid -> corridor -> released -> closed. */
export async function ShipmentTimeline({ input, details }: { input: TimelineInput; details?: Partial<Record<TimelineKey, string | null>> }) {
  const t = await getTranslations("flow");
  const events = buildTimeline(input);
  return (
    <ol className="relative">
      {events.map((e, idx) => {
        const Icon = ICONS[e.key];
        const last = idx === events.length - 1;
        const detail = details?.[e.key];
        return (
          <li key={e.key} className="relative flex gap-3 pb-5 last:pb-0 motion-safe:animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }} aria-current={e.state === "current" ? "step" : undefined}>
            {!last ? <span aria-hidden className={cn("absolute bottom-0 left-4 top-9 w-0.5 -translate-x-1/2 rounded-full", events[idx + 1]!.state === "todo" ? "bg-border" : "bg-success/60")} /> : null}
            <span
              aria-hidden
              className={cn(
                "relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                e.state === "done" && "border-success bg-success text-success-foreground",
                e.state === "current" && "border-primary bg-accent text-accent-foreground ring-4 ring-primary/15",
                e.state === "todo" && "border-border bg-card text-muted-foreground",
              )}
            >
              {e.state === "done" ? <Check className="size-4" /> : <Icon className="size-4" />}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className={cn("text-sm font-medium", e.state === "todo" && "text-muted-foreground")}>{t(`tl.${e.key}`)}</span>
                {e.state === "current" ? <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold leading-4 text-primary-foreground">{t("tlNow")}</span> : null}
                {detail ? <span className="num text-xs font-medium text-foreground/80">{detail}</span> : null}
              </div>
              {e.state === "done" ? <div className="num text-xs text-muted-foreground">{e.at ? fmtDateTime(e.at) : t("tlNoTime")}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
