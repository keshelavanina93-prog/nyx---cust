import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border bg-surface shadow-sm", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-4 sm:p-5", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold leading-tight", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-slate-600", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-0 sm:p-5 sm:pt-0", className)} {...props} />;
}

type BadgeTone = "neutral" | "ok" | "warn" | "danger" | "info" | "brand";
const tones: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  ok: "bg-green-50 text-green-800 border-green-200",
  warn: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-800 border-red-200",
  info: "bg-sky-50 text-sky-800 border-sky-200",
  brand: "bg-brand-50 text-brand-700 border-brand-100",
};
export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />;
}

export function Alert({ tone = "info", title, children, className }: { tone?: BadgeTone; title?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-md border px-4 py-3 text-sm", tones[tone], className)}>
      {title ? <div className="font-semibold">{title}</div> : null}
      {children ? <div className={cn(title && "mt-1")}>{children}</div> : null}
    </div>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-slate-700", className)} {...props} />;
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn("h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-brand-500", className)} {...props} />;
});

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ className, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }) {
  return (
    <label className={cn("inline-flex items-start gap-2 text-sm", className)}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600" {...props} />
      {label ? <span>{label}</span> : null}
    </label>
  );
}

export function Field({ label, hint, children, className }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}
export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("border-b bg-slate-50 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600", className)} {...props} />;
}
export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b px-2 py-2 align-top", className)} {...props} />;
}

export function Stat({ label, value, tone = "neutral", hint }: { label: React.ReactNode; value: React.ReactNode; tone?: BadgeTone; hint?: React.ReactNode }) {
  return (
    <div className={cn("rounded-md border p-3", tones[tone])}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="num mt-1 text-xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs opacity-80">{hint}</div> : null}
    </div>
  );
}

export function ConfidenceBar({ value, yellow = 0.75, red = 0.5 }: { value: number; yellow?: number; red?: number }) {
  const pct = Math.round(value * 100);
  const tone = value < red ? "bg-danger" : value < yellow ? "bg-warn" : "bg-ok";
  return (
    <div className="flex items-center gap-2" aria-label={`confidence ${pct}%`}>
      <div className="h-2 w-24 overflow-hidden rounded bg-slate-200">
        <div className={cn("h-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="num text-xs text-slate-600">{pct}%</span>
    </div>
  );
}
