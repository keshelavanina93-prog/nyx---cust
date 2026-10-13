import Link from "next/link";
import { count, desc, eq, gte, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Bot, Building2, FileCode2, FileSpreadsheet, FlaskConical, Hand, PackageCheck, Receipt, ShieldCheck, Sparkles, Layers } from "lucide-react";
import { getDb, schema } from "@/db/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Stat } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { AiRunsChart, type AiRunsDay } from "@/components/admin/ai-runs-chart";
import { EvalSummaryTable } from "@/components/admin/eval-metrics";
import { StatusBadge } from "@/components/admin/status-badge";
import { parseEvalSummary } from "@/components/admin/eval-utils";
import { fmtDateTime } from "@/lib/format";

const DAYS = 30;
const TZ = "Asia/Tbilisi";

/** ISO dates (Asia/Tbilisi) for the last `n` days, oldest first. Tbilisi has no DST, so 24h steps are safe. */
function lastDays(n: number): string[] {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => fmt.format(new Date(now - (n - 1 - i) * 86_400_000)));
}

export default async function AdminHome() {
  const t = await getTranslations("admin");
  const db = await getDb();
  const [orgs] = await db.select({ n: count() }).from(schema.organizations);
  const [ships] = await db.select({ n: count() }).from(schema.shipments);
  const [runs] = await db.select({ n: count() }).from(schema.aiRuns);
  const [confirmed] = await db.select({ n: count() }).from(schema.hsDecisions).where(eq(schema.hsDecisions.humanConfirmed, true));
  const [overrides] = await db.select({ n: count() }).from(schema.hsDecisions).where(eq(schema.hsDecisions.source, "manual"));
  const tariff = await db.query.tariffVersions.findFirst({ where: eq(schema.tariffVersions.isActive, true) });
  const lastEval = (await db.select().from(schema.evalResults).orderBy(desc(schema.evalResults.createdAt)).limit(1))[0];

  const days = lastDays(DAYS);
  const dayExpr = sql<string>`to_char(${schema.aiRuns.createdAt} at time zone 'Asia/Tbilisi', 'YYYY-MM-DD')`;
  const perDay = await db
    .select({
      day: dayExpr,
      runs: count(),
      errors: sql<number>`count(*) filter (where ${schema.aiRuns.error} is not null)`.mapWith(Number),
    })
    .from(schema.aiRuns)
    .where(gte(schema.aiRuns.createdAt, new Date(Date.now() - (DAYS + 1) * 86_400_000)))
    .groupBy(dayExpr);
  const byDay = new Map(perDay.map((r) => [r.day, r]));
  const chartData: AiRunsDay[] = days.map((d) => ({
    key: d,
    label: `${d.slice(8, 10)}.${d.slice(5, 7)}`,
    runs: Number(byDay.get(d)?.runs ?? 0),
    errors: Number(byDay.get(d)?.errors ?? 0),
  }));

  const evalParsed = lastEval ? parseEvalSummary(lastEval.summary) : null;
  const overrideCount = Number(overrides?.n ?? 0);
  const tariffTone = !tariff ? "warn" : tariff.isPlaceholder ? "danger" : "ok";
  const tariffValue = !tariff ? t("tariffNone") : tariff.isPlaceholder ? t("tariffPlaceholder") : t("tariffReal");
  const tariffHint = !tariff ? t("tariffNoneHint") : tariff.isPlaceholder ? t("tariffPlaceholderHint") : `${t("tariffRealHint")}: ${tariff.source}`;

  const links = [
    { href: "/admin/tariff", icon: FileSpreadsheet, title: t("tariff"), desc: t("tariffDesc") },
    { href: "/admin/fees", icon: Receipt, title: t("fees"), desc: t("feesDesc") },
    { href: "/admin/xml-samples", icon: FileCode2, title: t("xmlSamples"), desc: t("xmlSamplesDesc") },
    { href: "/admin/evals", icon: FlaskConical, title: t("evals"), desc: t("evalsDesc") },
    { href: "/admin/ai-runs", icon: Bot, title: t("aiRuns"), desc: t("aiRunsDesc") },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("overview")} description={t("overviewDesc")} eyebrow={t("title")} />

      <section aria-label={t("overview")} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={t("kpiOrgs")} value={orgs?.n ?? 0} icon={<Building2 aria-hidden />} />
        <Stat label={t("kpiShipments")} value={ships?.n ?? 0} icon={<PackageCheck aria-hidden />} />
        <Stat label={t("kpiAiRuns")} value={runs?.n ?? 0} icon={<Sparkles aria-hidden />} tone="brand" />
        <Stat label={t("kpiHsConfirmed")} value={confirmed?.n ?? 0} hint={t("kpiHsConfirmedHint")} icon={<ShieldCheck aria-hidden />} />
        <Stat label={t("kpiOverrides")} value={overrideCount} hint={t("kpiOverridesHint")} tone={overrideCount > 0 ? "warn" : "ok"} icon={<Hand aria-hidden />} />
        <Stat label={t("kpiTariff")} value={tariffValue} hint={tariffHint} tone={tariffTone} icon={<Layers aria-hidden />} />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("aiRunsPerDay")}</CardTitle>
            <CardDescription>{t("chartDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AiRunsChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle>{t("lastEval")}</CardTitle>
                {lastEval ? <CardDescription>{`${lastEval.suite} · ${fmtDateTime(lastEval.createdAt)}`}</CardDescription> : null}
              </div>
              {evalParsed ? (
                evalParsed.failed === 0 ? (
                  <StatusBadge tone="ok" dot>
                    {t("evalStatusPass")}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="danger" dot>
                    {t("evalStatusFail", { n: evalParsed.failed })}
                  </StatusBadge>
                )
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {evalParsed ? (
              <>
                <EvalSummaryTable metrics={evalParsed.metrics} />
                <Button asChild variant="link" size="sm">
                  <Link href="/admin/evals">
                    {t("allEvals")}
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </>
            ) : (
              <EmptyState icon={<FlaskConical aria-hidden />} title={t("noEvals")} description={t("lastEvalEmpty")} className="py-8" />
            )}
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="quick-links" className="space-y-3">
        <h2 id="quick-links" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("quickLinks")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
                <Card interactive className="h-full">
                  <CardContent className="flex items-start gap-3 pt-4 sm:pt-5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <l.icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                        {l.title}
                        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{l.desc}</span>
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
