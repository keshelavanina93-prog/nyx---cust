"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "./button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "./dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/** Radio items for light / dark / system. Reused by the theme toggle and the user menu. */
export function ThemeRadioItems() {
  const t = useTranslations("shell");
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
      <DropdownMenuRadioItem value="light">
        <Sun aria-hidden />
        {t("light")}
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="dark">
        <Moon aria-hidden />
        {t("dark")}
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="system">
        <Monitor aria-hidden />
        {t("system")}
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("shell");
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={className} aria-label={t("theme")}>
              <Sun className="dark:hidden" aria-hidden />
              <Moon className="hidden dark:block" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("theme")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <ThemeRadioItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
