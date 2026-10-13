import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Reveal, RevealStyles } from "@/components/marketing/reveal";
import { CalculatorForm } from "./calculator-form";

export default async function CalculatorPage() {
  const t = await getTranslations("calculator");
  const tl = await getTranslations("landing");
  return (
    <div className="min-h-dvh bg-app-gradient">
      <RevealStyles />
      <MarketingNav />
      <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <Reveal eager>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t("intro")}</p>
        </Reveal>
        <Reveal eager delay={0.1} className="mt-8">
          <CalculatorForm />
        </Reveal>
        <p className="mt-5 text-sm text-muted-foreground">{t("disclaimer")}</p>

        <Reveal className="mt-14">
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border bg-card p-6 shadow-soft sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">{t("ctaTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("ctaSub")}</p>
            </div>
            <Button asChild size="lg">
              <Link href="/login">
                {tl("cta")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </Reveal>
      </main>
      <MarketingFooter />
    </div>
  );
}
