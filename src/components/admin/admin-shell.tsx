"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Bot, ChevronRight, FileCode2, FileSpreadsheet, FlaskConical, LayoutDashboard, Menu, Receipt, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { LocaleSwitch } from "@/components/ui/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const NAV = [
  { key: "overview", href: "/admin", icon: LayoutDashboard, label: "overview" },
  { key: "tariff", href: "/admin/tariff", icon: FileSpreadsheet, label: "tariff" },
  { key: "fees", href: "/admin/fees", icon: Receipt, label: "fees" },
  { key: "xml", href: "/admin/xml-samples", icon: FileCode2, label: "xmlSamples" },
  { key: "evals", href: "/admin/evals", icon: FlaskConical, label: "evals" },
  { key: "ai", href: "/admin/ai-runs", icon: Bot, label: "aiRuns" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  return (
    <Link href="/admin" className="group flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35" aria-label={`${tc("appName")}: ${t("title")}`}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-danger text-danger-foreground shadow-sm transition-transform group-hover:scale-105">
        <ShieldAlert className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold tracking-tight">{tc("appName")}</span>
        <span className="block truncate text-[11px] font-medium text-muted-foreground">{t("title")}</span>
      </span>
    </Link>
  );
}

function NavList({ pathname, inSheet }: { pathname: string; inSheet?: boolean }) {
  const t = useTranslations("admin");
  return (
    <ul className="space-y-0.5">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        const link = (
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {active ? <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" /> : null}
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{t(item.label)}</span>
          </Link>
        );
        return <li key={item.key}>{inSheet ? <SheetClose asChild>{link}</SheetClose> : link}</li>;
      })}
    </ul>
  );
}

export function AdminShell({ userEmail, locale, children }: { userEmail: string; locale: string; children: React.ReactNode }) {
  const t = useTranslations("admin");
  const ts = useTranslations("shell");
  const pathname = usePathname();
  const [drawer, setDrawer] = React.useState(false);
  const current = NAV.find((n) => isActive(pathname, n.href));
  const showSection = current && current.key !== "overview";

  return (
    <div className="flex min-h-dvh bg-app-gradient">
      <a
        href="#main"
        className="no-print sr-only z-[60] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {ts("skipToContent")}
      </a>

      {/* Desktop sidebar (compact) */}
      <aside className="no-print sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r bg-card/70 backdrop-blur-xl lg:flex">
        <div className="flex h-14 items-center border-b px-3">
          <Brand />
        </div>
        <nav aria-label={t("navLabel")} className="scrollbar-thin flex-1 overflow-y-auto p-2.5">
          <NavList pathname={pathname} />
        </nav>
        <div className="space-y-2 border-t p-3">
          <Badge tone="danger" dot>
            {t("superadmin")}
          </Badge>
          <p className="truncate text-xs text-muted-foreground" title={userEmail}>
            {userEmail}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="no-print sticky top-0 z-30">
          <div aria-hidden className="h-0.5 bg-danger" />
          <header className="glass flex h-14 items-center gap-2 border-x-0 border-t-0 px-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label={ts("openMenu")}
              className="inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 lg:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </button>

            <nav aria-label="breadcrumb" className="min-w-0 flex-1">
              <ol className="flex min-w-0 items-center gap-1.5 text-sm">
                <li className="hidden items-center gap-1.5 sm:flex">
                  <Link href="/admin" className="truncate text-muted-foreground transition-colors hover:text-foreground">
                    {t("title")}
                  </Link>
                  {showSection ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden /> : null}
                </li>
                {showSection ? (
                  <li className="truncate font-medium" aria-current="page">
                    {t(current.label)}
                  </li>
                ) : (
                  <li className="truncate font-medium sm:hidden" aria-current="page">
                    {t("title")}
                  </li>
                )}
              </ol>
            </nav>

            <div className="flex items-center gap-1.5">
              <Badge tone="danger" dot className="hidden md:inline-flex">
                {t("superadmin")}
              </Badge>
              <Button asChild variant="secondary" size="sm">
                <Link href="/">
                  <ArrowLeft aria-hidden />
                  <span className="hidden sm:inline">{t("backToApp")}</span>
                  <span className="sr-only sm:hidden">{t("backToApp")}</span>
                </Link>
              </Button>
              <div className="hidden sm:block">
                <LocaleSwitch locale={locale} />
              </div>
              <ThemeToggle />
            </div>
          </header>
        </div>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-72 gap-3 p-4">
          <SheetHeader className="space-y-3 text-left">
            <SheetTitle className="sr-only">{t("navLabel")}</SheetTitle>
            <SheetDescription className="sr-only">{t("areaLabel")}</SheetDescription>
            <Brand />
          </SheetHeader>
          <nav aria-label={t("navLabel")}>
            <NavList pathname={pathname} inSheet />
          </nav>
          <div className="mt-auto space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <Badge tone="danger" dot>
                {t("superadmin")}
              </Badge>
              <LocaleSwitch locale={locale} />
            </div>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
