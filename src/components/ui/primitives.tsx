import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, TrendingDown, TrendingUp, Minus, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfidenceMeter } from "./animated";

export function Card({ className, interactive, ...props }: React.HTMLAttributes<HTMLDivElement> & { /** lift + highlight on hover (for clickable cards) */ interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-soft",
        interactive && "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift focus-within:border-primary/40",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-4 sm:p-5", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold leading-tight tracking-tight", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-0 sm:p-5 sm:pt-0", className)} {...props} />;
}
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 border-t p-4 sm:px-5", className)} {...props} />;
}

type BadgeTone = "neutral" | "ok" | "warn" | "danger" | "info" | "brand";
const tones: Record<BadgeTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  ok: "border-success/25 bg-success/10 text-success",
  warn: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
  info: "border-info/25 bg-info/10 text-info",
  brand: "border-primary/25 bg-accent text-accent-foreground",
};
const dots: Record<BadgeTone, string> = {
  neutral: "bg-muted-foreground",
  ok: "bg-success",
  warn: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  brand: "bg-primary",
};
export function Badge({ tone = "neutral", dot = false, className, children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; /** leading status dot */ dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium leading-5", tones[tone], className)} {...props}>
      {dot ? <span aria-hidden className={cn("size-1.5 rounded-full", dots[tone])} /> : null}
      {children}
    </span>
  );
}

const alertIcons: Record<BadgeTone, React.ComponentType<{ className?: string }>> = {
  neutral: Info,
  info: Info,
  brand: Info,
  ok: CheckCircle2,
  warn: AlertTriangle,
  danger: XCircle,
};
export function Alert({ tone = "info", title, children, className, hideIcon = false }: { tone?: BadgeTone; title?: React.ReactNode; children?: React.ReactNode; className?: string; hideIcon?: boolean }) {
  const Icon = alertIcons[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", tones[tone], className)}>
      {hideIcon ? null : <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1">
        {title ? <div className="font-semibold">{title}</div> : null}
        {children ? <div className={cn(title && "mt-1")}>{children}</div> : null}
      </div>
    </div>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-foreground", className)} {...props} />;
}

const controlBase =
  "w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/25";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(controlBase, "min-h-20 py-2", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, "h-10 cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ className, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-start gap-2 text-sm", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
        {...props}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
}

export function Field({ label, hint, error, children, className }: { label: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function Table({ className, stickyHeader, ...props }: React.TableHTMLAttributes<HTMLTableElement> & { /** constrain height so the header sticks while the body scrolls */ stickyHeader?: boolean }) {
  return (
    <div className={cn("scrollbar-thin w-full overflow-x-auto", stickyHeader && "max-h-[70dvh] overflow-y-auto")}>
      <table
        className={cn(
          "w-full border-separate border-spacing-0 text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-accent/60 [&_tbody_tr:nth-child(even)]:bg-muted/40 [&_tbody_tr:last-child_td]:border-b-0",
          className,
        )}
        {...props}
      />
    </div>
  );
}
export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("sticky top-0 z-[1] whitespace-nowrap border-b bg-muted px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:rounded-tl-lg last:rounded-tr-lg", className)}
      {...props}
    />
  );
}
export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-border/70 px-3 py-2.5 align-top", className)} {...props} />;
}

const statTones: Record<BadgeTone, string> = {
  neutral: "border-border bg-card text-card-foreground",
  ok: "border-success/25 bg-success/10 text-foreground",
  warn: "border-warning/30 bg-warning/10 text-foreground",
  danger: "border-danger/25 bg-danger/10 text-foreground",
  info: "border-info/25 bg-info/10 text-foreground",
  brand: "border-primary/25 bg-accent text-accent-foreground",
};
const statAccent: Record<BadgeTone, string> = {
  neutral: "text-muted-foreground",
  ok: "text-success",
  warn: "text-warning",
  danger: "text-danger",
  info: "text-info",
  brand: "text-primary",
};

type Trend = "up" | "down" | "flat";
export function Stat({
  label,
  value,
  tone = "neutral",
  hint,
  delta,
  trend,
  trendGood,
  icon,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: BadgeTone;
  hint?: React.ReactNode;
  /** e.g. "+12%" shown next to the value */
  delta?: React.ReactNode;
  /** arrow direction for `delta` */
  trend?: Trend;
  /** whether the trend is good (green) or bad (red); omit for neutral */
  trendGood?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <div className={cn("rounded-xl border p-4 shadow-xs", statTones[tone], className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        {icon ? <div className={cn("shrink-0 [&_svg]:size-4", statAccent[tone])}>{icon}</div> : null}
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
        <div className="num text-2xl font-semibold tracking-tight">{value}</div>
        {delta != null ? (
          <span className={cn("num inline-flex items-center gap-0.5 text-xs font-medium", trendGood === true ? "text-success" : trendGood === false ? "text-danger" : "text-muted-foreground")}>
            {trend ? <TrendIcon className="size-3.5" aria-hidden /> : null}
            {delta}
          </span>
        ) : null}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function ConfidenceBar({ value, yellow = 0.75, red = 0.5, className }: { value: number; yellow?: number; red?: number; className?: string }) {
  return <ConfidenceMeter value={value} yellow={yellow} red={red} className={className} />;
}
