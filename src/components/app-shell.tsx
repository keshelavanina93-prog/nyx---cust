import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { LocaleSwitch } from "@/components/ui/client";
import { logoutAction } from "@/app/login/actions";
import type { OrgContext } from "@/lib/org";

export async function AppShell({ ctx, children, active }: { ctx: OrgContext; children: React.ReactNode; active?: string }) {
  const t = await getTranslations("nav");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const base = `/${ctx.org.slug}`;
  const items: { href: string; label: string; key: string }[] = [
    { href: `${base}/dashboard`, label: t("dashboard"), key: "dashboard" },
    { href: `${base}/onboarding/ecustoms`, label: t("onboarding"), key: "onboarding" },
    { href: `${base}/suppliers`, label: t("suppliers"), key: "suppliers" },
    { href: `${base}/memory`, label: t("memory"), key: "memory" },
    { href: `${base}/settings`, label: t("settings"), key: "settings" },
  ];
  if (ctx.user.isSuperadmin) items.push({ href: "/admin", label: t("admin"), key: "admin" });
  return (
    <div className="min-h-screen">
      <header className="no-print border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Link href={`${base}/dashboard`} className="font-semibold">
            Customs Copilot GE
          </Link>
          <span className="text-xs text-slate-500">{ctx.org.name}</span>
          <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="main">
            {items.map((i) => (
              <Link key={i.key} href={i.href} className={`rounded px-2 py-1 ${active === i.key ? "bg-brand-50 font-medium text-brand-700" : "hover:bg-slate-100"}`} aria-current={active === i.key ? "page" : undefined}>
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <LocaleSwitch locale={locale} />
            <span className="hidden text-slate-500 sm:inline">{ctx.user.email}</span>
            <form action={logoutAction}>
              <button className="rounded px-2 py-1 hover:bg-slate-100" type="submit">
                {tc("logout")}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
