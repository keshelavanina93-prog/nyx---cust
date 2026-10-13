import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/org";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.isSuperadmin) redirect("/");
  const t = await getTranslations("admin");
  const items: [string, string][] = [
    ["/admin/tariff", t("tariff")],
    ["/admin/fees", t("fees")],
    ["/admin/xml-samples", t("xmlSamples")],
    ["/admin/evals", t("evals")],
    ["/admin/ai-runs", t("aiRuns")],
  ];
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2 text-sm">
          <Link href="/" className="font-semibold">
            Customs Copilot GE
          </Link>
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">{t("title")}</span>
          {items.map(([href, label]) => (
            <Link key={href} href={href} className="rounded px-2 py-1 hover:bg-slate-100">
              {label}
            </Link>
          ))}
          <span className="ml-auto text-xs text-slate-500">{user.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
