import * as React from "react";
import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { Alert } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Consistent two-column "guide + action" layout for the post-export shipment steps
 * (eCustoms, payment, corridor, close): stepper, page title, optional notice, then the
 * instructions on the left and the things to do on the right.
 */
export async function GuidePage({
  stepper,
  icon,
  title,
  description,
  badge,
  notice,
  noticeTone = "info",
  guide,
  aside,
  footer,
  className,
}: {
  stepper?: React.ReactNode;
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  notice?: React.ReactNode;
  noticeTone?: "info" | "warn" | "ok";
  guide: React.ReactNode;
  aside: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const t = await getTranslations("flow");
  return (
    <div className={cn("space-y-5", className)}>
      {stepper}
      <header className="no-print flex flex-wrap items-start gap-3">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-xs [&_svg]:size-5">
          {icon}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
            {badge}
          </div>
          {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </header>
      {notice ? <Alert tone={noticeTone}>{notice}</Alert> : null}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-labelledby="guide-heading" className="min-w-0 space-y-3">
          <h3 id="guide-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen aria-hidden className="size-4" />
            {t("guideTitle")}
          </h3>
          {guide}
        </section>
        <div className="min-w-0 space-y-4">{aside}</div>
      </div>
      {footer}
    </div>
  );
}

/** Small icon + title row used as the heading of an action card. */
export function CardIconTitle({ icon, children, className }: { icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </span>
  );
}
