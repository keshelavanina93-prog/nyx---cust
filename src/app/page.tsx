import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Calculator,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileCode2,
  FileText,
  Landmark,
  Library,
  ListChecks,
  Plus,
  Route,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Tags,
  TrafficCone,
  Wallet,
} from "lucide-react";
import { currentUser, listUserOrgs } from "@/lib/org";
import { STEPS, type StepKey } from "@/lib/shipments/status";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { AuthShell } from "@/components/marketing/auth-shell";
import { BrandMark } from "@/components/marketing/brand";
import { LandedCostTeaser } from "@/components/marketing/landed-cost-teaser";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Reveal, RevealStyles } from "@/components/marketing/reveal";

const PILLARS = [
  { n: 1, Icon: Route },
  { n: 2, Icon: ShieldAlert },
  { n: 3, Icon: Scale },
  { n: 4, Icon: Wallet },
] as const;

const STEP_ICONS: Record<StepKey, React.ComponentType<{ className?: string }>> = {
  intake: FileText,
  lines: ListChecks,
  hs: Tags,
  calc: Calculator,
  approve: BadgeCheck,
  export: FileCode2,
  ecustoms: Landmark,
  payment: CreditCard,
  corridor: TrafficCone,
  close: CheckCheck,
};

export default async function Home() {
  const user = await currentUser();
  if (user) {
    const orgs = await listUserOrgs(user.id);
    if (orgs.length === 1) redirect(`/${orgs[0]!.org.slug}/dashboard`);
    if (orgs.length === 0) redirect("/orgs/new");
    const t = await getTranslations("auth");
    return (
      <AuthShell wide>
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark className="size-12 rounded-xl [&_svg]:size-6" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t("chooseOrg")}</h1>
            <p className="text-sm text-muted-foreground">{t("chooseOrgSub")}</p>
          </div>
        </div>
        <ul className="space-y-3">
          {orgs.map(({ org, role }) => (
            <li key={org.id}>
              <Card interactive className="relative">
                <Link
                  href={`/${org.slug}/dashboard`}
                  className="flex items-center gap-3 rounded-xl p-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Building2 className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{org.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">/{org.slug}</span>
                  </span>
                  <Badge tone={role === "owner" ? "brand" : "neutral"}>{t(`role_${role}`)}</Badge>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </Card>
            </li>
          ))}
        </ul>
        <Button asChild variant="secondary" className="mt-4 w-full">
          <Link href="/orgs/new">
            <Plus aria-hidden />
            {t("createOrg")}
          </Link>
        </Button>
      </AuthShell>
    );
  }

  const t = await getTranslations("landing");
  const tn = await getTranslations("steps");
  const tnav = await getTranslations("nav");
  const tc = await getTranslations("common");
  const trust = [t("trust1"), t("trust2"), t("trust3")];

  return (
    <div className="min-h-dvh bg-app-gradient">
      <RevealStyles />
      <MarketingNav />
      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-0 size-96 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -right-24 top-24 size-96 rounded-full bg-info/15 blur-3xl" />
            <div
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "linear-gradient(to right, color-mix(in oklab, var(--border) 70%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 70%, transparent) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
                maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%)",
                WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%)",
              }}
            />
          </div>
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-24">
            <div>
              <Reveal eager>
                <Badge tone="brand" dot className="px-3 py-1">
                  {t("eyebrow")}
                </Badge>
              </Reveal>
              <Reveal eager delay={0.08}>
                <h1 className="mt-5 bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-4xl font-bold leading-[1.15] tracking-tight text-transparent sm:text-5xl">
                  {t("hero")}
                </h1>
              </Reveal>
              <Reveal eager delay={0.16}>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("sub")}</p>
              </Reveal>
              <Reveal eager delay={0.24}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href="/login">
                      {t("cta")}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/calculator">
                      <Calculator aria-hidden />
                      {t("ctaSecondary")}
                    </Link>
                  </Button>
                </div>
              </Reveal>
              <Reveal eager delay={0.32}>
                <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-1">
                  {trust.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
            <Reveal eager delay={0.2} y={24}>
              <LandedCostTeaser />
            </Reveal>
          </div>
        </section>

        {/* Pillars */}
        <section aria-labelledby="pillars-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <Reveal>
            <h2 id="pillars-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("pillarsTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{t("pillarsSub")}</p>
          </Reveal>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map(({ n, Icon }, i) => (
              <li key={n}>
                <Reveal delay={i * 0.07} className="h-full">
                  <Card interactive className="group h-full">
                    <CardHeader className="gap-3">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <CardTitle className="text-lg">{t(`pillar${n}`)}</CardTitle>
                      <CardDescription className="leading-relaxed">{t(`pillar${n}d`)}</CardDescription>
                    </CardHeader>
                  </Card>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <Reveal>
            <h2 id="how-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("howTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{t("howSub")}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <ol
              role="list"
              tabIndex={0}
              aria-label={t("stepsLabel")}
              className="scrollbar-thin -mx-4 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0"
            >
              {STEPS.map((key, i) => {
                const Icon = STEP_ICONS[key];
                return (
                  <li key={key} className="w-52 shrink-0 snap-start lg:w-auto">
                    <div className="group h-full rounded-xl border bg-card p-4 shadow-soft transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift">
                      <div className="flex items-center justify-between">
                        <span className="num flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                        <Icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
                      </div>
                      <div className="mt-3 font-semibold">{tn(key)}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{t(`step_${key}_d`)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Reveal>
        </section>

        {/* Co-pilot, not autopilot */}
        <section className="mx-auto max-w-6xl px-4 py-14">
          <Reveal>
            <div className="flex flex-col gap-5 rounded-2xl border bg-gradient-to-br from-accent via-card to-card p-6 shadow-soft sm:flex-row sm:items-start sm:p-10">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <ShieldCheck className="size-7" aria-hidden />
              </span>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{t("copilotTitle")}</h2>
                <p className="mt-3 max-w-3xl text-lg leading-relaxed text-foreground/90">{t("copilot")}</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-14">
          <Reveal>
            <div className="rounded-2xl bg-gradient-to-br from-primary to-info p-8 text-center text-primary-foreground shadow-lift sm:p-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("finalTitle")}</h2>
              <p className="mx-auto mt-3 max-w-xl text-lg opacity-95">{t("finalSub")}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" variant="secondary">
                  <Link href="/login">
                    {t("cta")}
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/pricing">{tnav("pricing")}</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Sources */}
        <section aria-labelledby="sources-title" className="mx-auto max-w-6xl px-4 pb-4">
          <Card>
            <CardContent className="flex gap-3 pt-5 sm:pt-5">
              <Library className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <h2 id="sources-title" className="text-sm font-semibold">
                  {t("sourcesTitle")}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("sources")}</p>
                <p className="mt-2 text-xs text-muted-foreground">{tc("indicatorNotLegal")}</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
