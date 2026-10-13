import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalculatorForm } from "./calculator-form";

export default async function CalculatorPage() {
  const t = await getTranslations("calculator");
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-brand-600 underline">
        ← Customs Copilot GE
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-slate-600">{t("intro")}</p>
      <div className="mt-6">
        <CalculatorForm />
      </div>
      <p className="mt-4 text-xs text-slate-500">{t("disclaimer")}</p>
    </main>
  );
}
