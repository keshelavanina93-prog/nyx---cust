"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Copy, Check, HelpCircle, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label, className }: { value: string; label?: string; className?: string }) {
  const t = useTranslations("common");
  const [done, setDone] = React.useState(false);
  return (
    <button
      type="button"
      className={cn("no-print inline-flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-xs hover:bg-slate-50", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      aria-label={label ?? t("copy")}
    >
      {done ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
      {done ? t("copied") : (label ?? t("copy"))}
    </button>
  );
}

/** "ახსენი მარტივად" popover for customs terms. */
export function Explain({ term, children }: { term: keyof IntlMessages["terms"]; children?: React.ReactNode }) {
  const t = useTranslations("terms");
  const tc = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button type="button" aria-label={tc("explain")} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="no-print text-slate-400 hover:text-brand-600">
        <HelpCircle className="h-4 w-4" />
      </button>
      {open ? (
        <span role="dialog" className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-lg">
          <span className="mb-1 block font-semibold text-slate-900">{tc("explain")}</span>
          {t(term)}
        </span>
      ) : null}
    </span>
  );
}

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

export function LocaleSwitch({ locale }: { locale: string }) {
  return (
    <form action="/api/locale" method="post" className="inline-flex items-center gap-1 text-xs">
      {["ka", "en"].map((l) => (
        <button key={l} name="locale" value={l} className={cn("rounded px-2 py-1 uppercase", l === locale ? "bg-slate-200 font-semibold" : "hover:bg-slate-100")} type="submit">
          {l}
        </button>
      ))}
    </form>
  );
}

export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="secondary" className="no-print" onClick={() => window.print()}>
      {label}
    </Button>
  );
}

export function ConfirmSubmit({ message, children, ...props }: ButtonProps & { message: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
