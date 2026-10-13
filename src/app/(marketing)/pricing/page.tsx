import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check, ChevronDown, Scale } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Reveal, RevealStyles } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

const PLANS = [
  { key: "free", price: "freePrice", features: ["feat_wizard", "feat_oneDecl"] },
  { key: "ppd", price: "ppdPrice", features: ["feat_noHsPricing", "feat_xml"] },
  { key: "self", price: "selfPrice", features: ["feat_upTo3", "feat_xml", "feat_valueRisk", "feat_guide"], recommended: true },
  { key: "selfPro", price: "selfProPrice", features: ["feat_everythingSelf", "feat_unlimited", "feat_memory", "feat_messenger", "feat_team", "feat_analytics"] },
  { key: "assist", price: "assistPrice", features: ["feat_call", "feat_oneOff"] },
] as const;

const FAQ = [1, 2, 3, 4, 5, 6] as const;

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  const tl = await getTranslations("landing");
  const tc = await getTranslations("common");
  return (
    <div className="min-h-dvh bg-app-gradient">
      <RevealStyles />
      <MarketingNav />
      <main id="main" className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <Reveal eager className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{t("subtitle")}</p>
          <p className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <Badge tone="warn" dot>
              {tc("assumption")}
            </Badge>
            {t("note")}
          </p>
        </Reveal>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-5 xl:items-stretch">
          {PLANS.map((p, i) => {
            const recommended = "recommended" in p && p.recommended;
            return (
              <li key={p.key} className="flex">
                <Reveal delay={i * 0.06} className="flex w-full">
                  <Card className={cn("relative flex w-full flex-col", recommended && "border-primary shadow-lift ring-2 ring-primary/70 xl:-my-3")}>
                    {recommended ? (
                      <Badge tone="brand" className="absolute -top-3 left-1/2 -translate-x-1/2 border-primary bg-primary px-3 text-primary-foreground">
                        {t("recommended")}
                      </Badge>
                    ) : null}
                    <CardHeader className="gap-2">
                      <CardTitle className="text-lg">{t(p.key)}</CardTitle>
                      <CardDescription>{t(`tag_${p.key}`)}</CardDescription>
                      <div className="num pt-2 text-2xl font-bold tracking-tight">{t(p.price)}</div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-5">
                      <ul className="flex-1 space-y-2.5 text-sm">
                        {p.features.map((f) => (
                          <li key={f} className="flex gap-2">
                            <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                            <span>{t(f)}</span>
                          </li>
                        ))}
                      </ul>
                      <Button asChild variant={recommended ? "default" : "outline"} className="w-full">
                        <Link href="/login">{p.key === "free" ? tl("cta") : t("choose")}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </Reveal>
              </li>
            );
          })}
        </ul>

        <Reveal className="mx-auto mt-14 max-w-3xl">
          <Card>
            <CardContent className="flex gap-4 pt-5 sm:pt-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Scale className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold">{t("compareTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <Badge tone="ok" className="mr-1.5 align-middle">
                    {t("compareTag")}
                  </Badge>
                  {t("compareNote")}
                </p>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <section aria-labelledby="faq-title" className="mx-auto mt-16 max-w-3xl">
          <Reveal>
            <h2 id="faq-title" className="text-2xl font-bold tracking-tight">
              {t("faqTitle")}
            </h2>
            <div className="mt-6 divide-y overflow-hidden rounded-xl border bg-card shadow-soft">
              {FAQ.map((n) => (
                <details key={n} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/35 [&::-webkit-details-marker]:hidden">
                    {t(`faq${n}q`)}
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="animate-fade-in px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{t(`faq${n}a`)}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>

        <Reveal className="mx-auto mt-16 max-w-3xl">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-info p-8 text-center text-primary-foreground shadow-lift">
            <h2 className="text-2xl font-bold tracking-tight">{t("ctaTitle")}</h2>
            <p className="mx-auto mt-2 max-w-xl opacity-95">{t("ctaSub")}</p>
            <Button asChild size="lg" variant="secondary" className="mt-5">
              <Link href="/login">{tl("cta")}</Link>
            </Button>
          </div>
        </Reveal>
      </main>
      <MarketingFooter />
    </div>
  );
}
