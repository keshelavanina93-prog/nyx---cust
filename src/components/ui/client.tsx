"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Copy, Check, HelpCircle } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { toast } from "./toaster";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label, className }: { value: string; label?: string; className?: string }) {
  const t = useTranslations("common");
  const ts = useTranslations("shell");
  const [done, setDone] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className={cn(
        "no-print inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-card px-2 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 active:scale-[0.97]",
        className,
      )}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(t("copied"), { description: value.length > 60 ? `${value.slice(0, 57)}…` : value, duration: 2000 });
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error(ts("copyFailed"));
        }
      }}
      aria-label={label ?? t("copy")}
    >
      {done ? <Check className="size-3 text-success" aria-hidden /> : <Copy className="size-3" aria-hidden />}
      {done ? t("copied") : (label ?? t("copy"))}
    </button>
  );
}

/** "ახსენი მარტივად" popover for customs terms. */
export function Explain({ term, children }: { term: keyof IntlMessages["terms"]; children?: React.ReactNode }) {
  const t = useTranslations("terms");
  const tc = useTranslations("common");
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={tc("explain")}
            className="no-print rounded-full text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
          >
            <HelpCircle className="size-4" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="text-xs leading-relaxed">
          <span className="mb-1 block font-semibold text-foreground">{tc("explain")}</span>
          <span className="text-muted-foreground">{t(term)}</span>
        </PopoverContent>
      </Popover>
    </span>
  );
}

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" {...props} loading={pending || props.loading} disabled={props.disabled}>
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

export function LocaleSwitch({ locale }: { locale: string }) {
  const t = useTranslations("common");
  return (
    <form action="/api/locale" method="post" className="inline-flex items-center rounded-lg bg-muted p-0.5 text-xs" role="group" aria-label={t("language")}>
      {["ka", "en"].map((l) => (
        <button
          key={l}
          name="locale"
          value={l}
          type="submit"
          aria-pressed={l === locale}
          className={cn(
            "rounded-md px-2 py-1 font-medium uppercase transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
            l === locale ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
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

/** Submit button that asks for confirmation in a dialog before submitting its form. */
export function ConfirmSubmit({ message, children, onClick, ...props }: ButtonProps & { message: string }) {
  const { pending } = useFormStatus();
  const tc = useTranslations("common");
  const ref = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const destructive = props.variant === "danger" || props.variant === "destructive";
  return (
    <>
      <Button
        ref={ref}
        type="submit"
        {...props}
        loading={pending || props.loading}
        disabled={props.disabled}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tc("confirm")}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              variant={destructive ? "destructive" : "default"}
              onClick={() => {
                setOpen(false);
                const btn = ref.current;
                // submit the original form with the original submitter (keeps name/value + formAction)
                if (btn?.form) btn.form.requestSubmit(btn);
              }}
            >
              {tc("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
