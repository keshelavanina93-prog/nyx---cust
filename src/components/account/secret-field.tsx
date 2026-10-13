"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { CopyButton } from "@/components/ui/client";

/** One-time code / secret: masked by default, reveal toggle, copy puts `prefix + secret` on the clipboard. */
export function SecretField({ secret, prefix = "" }: { secret: string; prefix?: string }) {
  const t = useTranslations("settingsUi");
  const [shown, setShown] = React.useState(false);
  const masked = `${"•".repeat(Math.max(0, secret.length - 4))}${secret.slice(-4)}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="num min-w-0 max-w-full break-all rounded-md border bg-muted px-2 py-1 text-xs">
        {prefix}
        {shown ? secret : masked}
      </code>
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-card px-2 text-xs font-medium shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
      >
        {shown ? <EyeOff className="size-3" aria-hidden /> : <Eye className="size-3" aria-hidden />}
        {shown ? t("hide") : t("show")}
      </button>
      <CopyButton value={`${prefix}${secret}`} />
    </div>
  );
}
