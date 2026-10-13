import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookMarked, Search, SearchX, X } from "lucide-react";
import { getDb } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, Card, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/client";
import { EmptyState } from "@/components/ui/empty-state";
import { searchTariff } from "@/lib/tariff/search";
import { loadActiveTariff } from "@/lib/shipments/queries";

/** 6109100000 -> "6109 10 00 00" (only for the standard 10-digit code). */
function groupHs(code: string) {
  return /^\d{10}$/.test(code) ? `${code.slice(0, 4)} ${code.slice(4, 6)} ${code.slice(6, 8)} ${code.slice(8)}` : code;
}
const pct = (v: string | null) => (v === null ? null : `${Number(v)}%`);

export default async function TariffSearchPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ q?: string }> }) {
  const { org } = await params;
  const ctx = await requireOrg(org);
  const { q = "" } = await searchParams;
  const t = await getTranslations("hs");
  const tc = await getTranslations("common");
  const tt = await getTranslations("tariffUi");
  const db = await getDb();
  const tariff = await loadActiveTariff(db);
  const query = q.trim();
  const hits = query ? await searchTariff(db, query, 50) : [];

  return (
    <AppShell ctx={ctx}>
      <PageHeader
        title={t("searchTariff")}
        description={tt("intro")}
        actions={tariff?.isPlaceholder ? <Badge tone="danger" dot>{tc("placeholder")}</Badge> : undefined}
      />

      <form role="search" className="mb-5 flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" type="search" defaultValue={query} placeholder={tt("placeholder")} aria-label={tt("placeholder")} autoFocus={!query} className="h-11 pl-10 pr-9 text-base" />
          {query ? (
            <Link href={`/${ctx.org.slug}/tariff`} className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
              <X aria-hidden className="size-4" />
              <span className="sr-only">{tt("clear")}</span>
            </Link>
          ) : null}
        </div>
        <Button type="submit" size="lg">
          <Search aria-hidden />
          {tc("search")}
        </Button>
      </form>

      {!query ? (
        <EmptyState icon={<BookMarked />} title={tt("emptyTitle")} description={tt("emptyHint")} />
      ) : hits.length === 0 ? (
        <EmptyState icon={<SearchX />} title={tt("noResultsTitle")} description={tt("noResultsHint", { q: query })} />
      ) : (
        <section aria-live="polite" className="space-y-3">
          <p className="text-sm text-muted-foreground">{tt("results", { n: hits.length })}</p>
          <ul className="grid gap-3 lg:grid-cols-2">
            {hits.map((h, i) => (
              <li key={h.id} className="motion-safe:animate-slide-up" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                <Card className="flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-lift">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num rounded-md bg-accent px-2 py-1 text-base font-semibold tracking-wide text-accent-foreground">{groupHs(h.hsCode)}</span>
                    <Badge tone="info" className="num">
                      {t("duty")} {pct(h.dutyRate)}
                    </Badge>
                    {h.exciseRate !== null ? (
                      <Badge tone="warn" className="num">
                        {tt("excise")} {pct(h.exciseRate)}
                      </Badge>
                    ) : null}
                    {h.vatExempt ? <Badge tone="ok">{tt("vatExempt")}</Badge> : null}
                    <CopyButton value={h.hsCode} label={tt("copyCode")} className="ml-auto" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium leading-snug">{h.descriptionKa}</p>
                    {h.descriptionEn ? <p className="text-xs text-muted-foreground">{h.descriptionEn}</p> : null}
                  </div>
                  {h.unit || h.requiresDocs.length ? (
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {h.unit ? (
                        <span>
                          {tt("unit")}: <span className="font-medium text-foreground">{h.unit}</span>
                        </span>
                      ) : null}
                      {h.requiresDocs.map((d) => (
                        <Badge key={d} title={tt("requiresDoc")}>
                          {d}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
