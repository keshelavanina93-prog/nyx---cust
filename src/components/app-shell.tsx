import { cookies } from "next/headers";
import { getTranslations, getLocale } from "next-intl/server";
import { logoutAction } from "@/app/login/actions";
import { ShellFrame, type ShellNavItem } from "@/components/shell/shell-frame";
import type { OrgContext } from "@/lib/org";

/**
 * Authenticated app chrome: collapsible sidebar, top bar (breadcrumb, command palette, locale, theme, user menu),
 * mobile bottom nav + drawer and an animated content area. Server component; all interactivity lives in `ShellFrame`.
 */
export async function AppShell({
  ctx,
  children,
  active,
  breadcrumb,
}: {
  ctx: OrgContext;
  children: React.ReactNode;
  /** nav key of the current section: dashboard | onboarding | suppliers | memory | settings | admin */
  active?: string;
  /** optional replacement for the default "organisation / current page" breadcrumb */
  breadcrumb?: React.ReactNode;
}) {
  const t = await getTranslations("nav");
  const locale = await getLocale();
  const base = `/${ctx.org.slug}`;
  const items: ShellNavItem[] = [
    { href: `${base}/dashboard`, label: t("dashboard"), key: "dashboard" },
    { href: `${base}/onboarding/ecustoms`, label: t("onboarding"), key: "onboarding" },
    { href: `${base}/suppliers`, label: t("suppliers"), key: "suppliers" },
    { href: `${base}/memory`, label: t("memory"), key: "memory" },
    { href: `${base}/settings`, label: t("settings"), key: "settings" },
  ];
  if (ctx.user.isSuperadmin) items.push({ href: "/admin", label: t("admin"), key: "admin" });
  const defaultCollapsed = (await cookies()).get("sidebar_collapsed")?.value === "1";
  return (
    <ShellFrame
      base={base}
      orgName={ctx.org.name}
      userEmail={ctx.user.email}
      items={items}
      active={active}
      locale={locale}
      defaultCollapsed={defaultCollapsed}
      logoutAction={logoutAction}
      newShipment={{ href: `${base}/shipments/new`, label: t("newShipment") }}
      breadcrumb={breadcrumb}
    >
      {children}
    </ShellFrame>
  );
}
