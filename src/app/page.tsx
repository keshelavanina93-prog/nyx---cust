import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { currentUser, listUserOrgs } from "@/lib/org";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/primitives";
import { LocaleSwitch } from "@/components/ui/client";

export default async function Home() {
  const user = await currentUser();
  if (user) {
    const orgs = await listUserOrgs(user.id);
    if (orgs.length === 1) redirect(`/${orgs[0]!.org.slug}/dashboard`);
    if (orgs.length === 0) redirect("/orgs/new");
    const t = await getTranslations("auth");
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-4 text-xl font-semibold">{t("chooseOrg")}</h1>
        <ul className="space-y-2">
          {orgs.map(({ org, role }) => (
            <li key={org.id}>
              <Link href={`/${org.slug}/dashboard`} className="block rounded-md border bg-white p-3 hover:bg-slate-50">
                <span className="font-medium">{org.name}</span> <span className="text-xs text-slate-500">· {role}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/orgs/new" className="mt-4 inline-block text-sm text-brand-600 underline">
          {t("createOrg")}
        </Link>
      </main>
    );
  }
  const t = await getTranslations("landing");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const pillars = [1, 2, 3, 4] as const;
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10 flex items-center justify-between">
        <span className="text-lg font-semibold">Customs Copilot GE</span>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/pricing" className="hover:underline">
            {tn("pricing")}
          </Link>
          <Link href="/calculator" className="hover:underline">
            {tn("calculator")}
          </Link>
          <LocaleSwitch locale={locale} />
          <Link href="/login">
            <Button size="sm">{t("cta")}</Button>
          </Link>
        </nav>
      </header>
      <section className="mb-12">
        <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">{t("hero")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">{t("sub")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login">
            <Button size="lg">{t("cta")}</Button>
          </Link>
          <Link href="/calculator">
            <Button size="lg" variant="secondary">
              {t("ctaSecondary")}
            </Button>
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {pillars.map((p) => (
          <Card key={p}>
            <CardHeader>
              <CardTitle>{t(`pillar${p}`)}</CardTitle>
              <CardDescription>{t(`pillar${p}d`)}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
      <p className="mt-10 rounded-md border bg-white p-4 text-sm text-slate-700">{t("copilot")}</p>
      <Card className="mt-6">
        <CardContent className="pt-5 text-xs text-slate-500">
          წყაროები: RS წლიური ანგარიში 2024; მთავრობის №96 დადგენილება (2022 №201 რედ.); საბაჟო კოდექსი მ.6, მ.8, მ.167; rs.ge სერვისები p=84 / p=841. დეტალები: docs/assumptions.md.
        </CardContent>
      </Card>
    </main>
  );
}
