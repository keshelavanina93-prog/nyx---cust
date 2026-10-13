import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Brand } from "@/components/marketing/brand";

/** Footer for the public pages: brand, links and the legal line. */
export async function MarketingFooter() {
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const ta = await getTranslations("auth");
  const tl = await getTranslations("landing");
  const links = [
    { href: "/pricing", label: tn("pricing") },
    { href: "/calculator", label: tn("calculator") },
    { href: "/login", label: ta("title") },
  ];
  return (
    <footer className="mt-20 border-t bg-card/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Brand name={tc("appName")} />
          <p className="text-sm text-muted-foreground">{tc("tagline")}</p>
        </div>
        <nav aria-label={tl("footerLinks")}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">{tc("legalLine")}</p>
      </div>
    </footer>
  );
}
