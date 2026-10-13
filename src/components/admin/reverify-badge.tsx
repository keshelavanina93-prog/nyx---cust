"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/primitives";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** "Needs re-verification" badge. Focusable so the tooltip (with the pointer to docs/assumptions.md) works from the keyboard. */
export function ReverifyBadge() {
  const t = useTranslations("admin");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
          <Badge tone="warn" dot>
            {t("needsReverification")}
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 leading-relaxed">{t("reverifyTip")}</TooltipContent>
    </Tooltip>
  );
}
