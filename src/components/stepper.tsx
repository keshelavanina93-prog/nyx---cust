import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { STEPS, stepIndexForStatus, type StepKey } from "@/lib/shipments/status";

export async function Stepper({ base, status, current }: { base: string; status: string; current: StepKey }) {
  const t = await getTranslations("steps");
  const reached = stepIndexForStatus(status);
  return (
    <nav aria-label="steps" className="no-print -mx-4 overflow-x-auto px-4">
      <ol className="flex min-w-max items-center gap-1 text-xs">
        {STEPS.map((s, i) => {
          const done = i < reached;
          const isCurrent = s === current;
          const enabled = i <= reached;
          const cls = cn(
            "flex items-center gap-1 rounded-full border px-3 py-1",
            isCurrent ? "border-brand-600 bg-brand-600 text-white" : done ? "border-green-200 bg-green-50 text-green-800" : enabled ? "bg-white hover:bg-slate-50" : "bg-slate-100 text-slate-400",
          );
          const inner = (
            <>
              <span className="num">{i + 1}</span>
              <span>{t(s)}</span>
            </>
          );
          return (
            <li key={s}>
              {enabled ? (
                <Link href={`${base}/${s}`} className={cls} aria-current={isCurrent ? "step" : undefined}>
                  {inner}
                </Link>
              ) : (
                <span className={cls} aria-disabled>
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
