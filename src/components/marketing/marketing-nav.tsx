"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LogIn, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleSwitch } from "@/components/ui/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Brand } from "@/components/marketing/brand";
import { cn } from "@/lib/utils";

/** Sticky top navigation shared by the public pages (landing, pricing, calculator). */
export function MarketingNav() {
  const t = useTranslations("nav");
  const ta = useTranslations("auth");
  const ts = useTranslations("shell");
  const tc = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const links = [
    { href: "/pricing", label: t("pricing") },
    { href: "/calculator", label: t("calculator") },
  ];
  return (
    <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Brand href="/" name={tc("appName")} nameClassName="max-[420px]:sr-only" />
        <nav aria-label={ts("mainNav")} className="ml-4 hidden items-center gap-1 sm:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <LocaleSwitch locale={locale} />
          <ThemeToggle />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/login">
              <LogIn aria-hidden />
              {ta("title")}
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden" aria-label={ts("openMenu")}>
                <Menu aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              {links.map((l) => (
                <DropdownMenuItem key={l.href} asChild>
                  <Link href={l.href}>{l.label}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild>
                <Link href="/login">
                  <LogIn aria-hidden />
                  {ta("title")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
