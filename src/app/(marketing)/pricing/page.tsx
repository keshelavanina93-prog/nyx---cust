import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  const tl = await getTranslations("landing");
  const plans = [
    { name: t("free"), price: t("freePrice"), d: "eCustoms დაშვების ოსტატი + 1 სრული დეკლარაცია XML-ით" },
    { name: t("ppd"), price: t("ppdPrice"), d: "HS კოდების რაოდენობის მიუხედავად; XML შედის" },
    { name: t("self"), price: t("selfPrice"), d: t("selfD") },
    { name: t("selfPro"), price: t("selfProPrice"), d: t("selfProD") },
    { name: t("assist"), price: t("assistPrice"), d: "ზარი / გაზიარებული ეკრანი განცხადების შევსებისას" },
  ];
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/" className="text-sm text-brand-600 underline">
        ← Customs Copilot GE
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {t("note")} <Badge tone="warn">[ASSUMPTION]</Badge>
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.name}>
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
              <CardDescription className="num text-2xl font-semibold text-ink">{p.price}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">{p.d}</CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-600">კონტექსტი [VERIFIED]: DECLARO Pro 59 ₾ / Max 236 ₾ (დღგ-ით), XML მხოლოდ Max-ში; ბროკერი 100–150 ₾ დეკლარაციაზე.</p>
      <Link href="/login" className="mt-6 inline-block">
        <Button>{tl("cta")}</Button>
      </Link>
    </main>
  );
}
