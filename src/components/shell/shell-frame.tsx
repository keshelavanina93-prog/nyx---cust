"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Brain,
  Building2,
  ChevronRight,
  Factory,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LocaleSwitch } from "@/components/ui/client";
import { ThemeRadioItems, ThemeToggle } from "@/components/ui/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPaletteTrigger, RegisterCommands, type CommandPaletteItem } from "@/components/command-palette";
import { PageTransition } from "@/components/page-transition";

export type ShellNavItem = { href: string; label: string; key: string };

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  onboarding: KeyRound,
  suppliers: Factory,
  memory: Brain,
  settings: Settings,
  admin: ShieldCheck,
};

const COLLAPSE_COOKIE = "sidebar_collapsed";

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}

function Brand({ href, collapsed, appName }: { href: string; collapsed?: boolean; appName: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35" aria-label={appName}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
        <PackageCheck className="size-[18px]" aria-hidden />
      </span>
      <span className={cn("truncate text-sm font-semibold tracking-tight", collapsed && "sr-only")}>{appName}</span>
    </Link>
  );
}

function SidebarLink({ item, active, collapsed }: { item: ShellNavItem; active: boolean; collapsed: boolean }) {
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active ? <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" /> : null}
      <NavIcon name={item.key} className="size-[18px] shrink-0" />
      <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function initials(email: string) {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[._\-+\s]+/).filter(Boolean);
  const letters = (parts.length > 1 ? parts[0]![0]! + parts[1]![0]! : name.slice(0, 2)) || "?";
  return letters.toUpperCase();
}

function UserMenu({ email, settingsHref, onLogout }: { email: string; settingsHref: string; onLogout: () => void }) {
  const t = useTranslations("shell");
  const tc = useTranslations("common");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("profile")}
        className="inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-info text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
      >
        {initials(email)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-xs text-muted-foreground">{t("signedInAs")}</span>
          <span className="block truncate text-sm font-medium text-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={settingsHref}>
            <User aria-hidden />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette aria-hidden />
            {t("theme")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <ThemeRadioItems />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} className="text-danger data-[highlighted]:bg-danger/10 data-[highlighted]:text-danger">
          <LogOut aria-hidden />
          {tc("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ShellFrame({
  base,
  orgName,
  userEmail,
  items,
  active,
  locale,
  defaultCollapsed,
  logoutAction,
  newShipment,
  breadcrumb,
  children,
}: {
  base: string;
  orgName: string;
  userEmail: string;
  items: ShellNavItem[];
  active?: string;
  locale: string;
  defaultCollapsed: boolean;
  logoutAction: () => Promise<void>;
  newShipment: { href: string; label: string };
  /** replaces the default "organisation / current page" breadcrumb */
  breadcrumb?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("shell");
  const tc = useTranslations("common");
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const logoutForm = React.useRef<HTMLFormElement>(null);
  const activeItem = items.find((i) => i.key === active);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        document.cookie = `${COLLAPSE_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const commands = React.useMemo<CommandPaletteItem[]>(
    () => [
      { id: "new-shipment", label: newShipment.label, href: newShipment.href, group: t("commandActions"), icon: <PackagePlus aria-hidden />, keywords: ["new", "shipment", "declaration"] },
      ...items.map((i) => ({ id: `nav-${i.key}`, label: i.label, href: i.href, group: t("commandNavigate"), icon: <NavIcon name={i.key} /> })),
    ],
    [items, newShipment.href, newShipment.label, t],
  );

  const bottomItems = items.slice(0, 4);
  const appName = tc("appName");

  return (
    <div className="flex min-h-dvh bg-app-gradient">
      <a
        href="#main"
        className="no-print sr-only z-[60] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t("skipToContent")}
      </a>
      <RegisterCommands items={commands} />
      <form ref={logoutForm} action={logoutAction} className="hidden" aria-hidden />

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "no-print sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-card/70 backdrop-blur-xl transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        <div className={cn("flex h-14 items-center border-b px-4", collapsed && "justify-center px-0")}>
          <Brand href={`${base}/dashboard`} collapsed={collapsed} appName={appName} />
        </div>
        {!collapsed ? (
          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
              <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate text-sm font-medium" title={orgName}>
                {orgName}
              </span>
            </div>
          </div>
        ) : null}
        <nav aria-label={t("mainNav")} className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.key}>
                <SidebarLink item={i} active={active === i.key} collapsed={collapsed} />
              </li>
            ))}
          </ul>
        </nav>
        <div className={cn("border-t p-3", collapsed && "flex justify-center")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggle}
                aria-expanded={!collapsed}
                aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
                  collapsed ? "w-9 justify-center px-0" : "w-full",
                )}
              >
                {collapsed ? <PanelLeftOpen className="size-[18px]" aria-hidden /> : <PanelLeftClose className="size-[18px]" aria-hidden />}
                {collapsed ? null : <span className="truncate">{t("collapseSidebar")}</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{collapsed ? t("expandSidebar") : t("collapseSidebar")}</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="glass no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-x-0 border-t-0 px-3 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("openMenu")}
            className="inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <nav aria-label="breadcrumb" className="min-w-0 flex-1">
            {breadcrumb ?? (
              <ol className="flex min-w-0 items-center gap-1.5 text-sm">
                <li className="hidden min-w-0 items-center gap-1.5 sm:flex">
                  <Link href={`${base}/dashboard`} className="truncate text-muted-foreground transition-colors hover:text-foreground">
                    {orgName}
                  </Link>
                  {activeItem ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden /> : null}
                </li>
                {activeItem ? (
                  <li className="truncate font-medium" aria-current="page">
                    {activeItem.label}
                  </li>
                ) : (
                  <li className="truncate font-medium sm:hidden">{orgName}</li>
                )}
              </ol>
            )}
          </nav>

          <div className="flex items-center gap-1.5">
            <CommandPaletteTrigger className="hidden md:inline-flex" />
            <CommandPaletteTrigger compact className="md:hidden" />
            <div className="hidden sm:block">
              <LocaleSwitch locale={locale} />
            </div>
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <UserMenu email={userEmail} settingsHref={`${base}/settings`} onLogout={() => logoutForm.current?.requestSubmit()} />
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 sm:px-6 lg:pb-10 print:max-w-none print:p-0">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label={t("mobileNav")} className="glass no-print fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-5">
          {bottomItems.map((i) => (
            <li key={i.key}>
              <Link
                href={i.href}
                aria-current={active === i.key ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/35",
                  active === i.key ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <NavIcon name={i.key} className="size-5" />
                <span className="max-w-full truncate">{i.label}</span>
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/35"
            >
              <Menu className="size-5" aria-hidden />
              <span className="max-w-full truncate">{t("menu")}</span>
            </button>
          </li>
        </ul>
      </nav>
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[85%] max-w-xs p-0">
          <SheetHeader className="border-b px-4 py-3.5">
            <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
            <SheetDescription className="sr-only">{orgName}</SheetDescription>
            <Brand href={`${base}/dashboard`} appName={appName} />
          </SheetHeader>
          <div className="px-4">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
              <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate text-sm font-medium">{orgName}</span>
            </div>
          </div>
          <nav aria-label={t("mainNav")} className="flex-1 overflow-y-auto px-3">
            <ul className="space-y-1">
              {items.map((i) => (
                <li key={i.key}>
                  <SheetClose asChild>
                    <Link
                      href={i.href}
                      aria-current={active === i.key ? "page" : undefined}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
                        active === i.key ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <NavIcon name={i.key} className="size-5 shrink-0" />
                      {i.label}
                    </Link>
                  </SheetClose>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
            <LocaleSwitch locale={locale} />
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
