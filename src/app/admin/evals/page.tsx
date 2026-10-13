import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { ChevronDown, FlaskConical } from "lucide-react";
import { getDb, schema } from "@/db/client";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/client";
import { EvalMetricBar } from "@/components/admin/eval-metrics";
import { StatusBadge } from "@/components/admin/status-badge";
import { parseEvalSummary } from "@/components/admin/eval-utils";
import { fmtDateTime } from "@/lib/format";

export default async function EvalsPage() {
  const t = await getTranslations("admin");
  const db = await getDb();
  const rows = await db.select().from(schema.evalResults).orderBy(desc(schema.evalResults.createdAt)).limit(20);
  return (
    <div className="space-y-6">
      <PageHeader title={t("evals")} description={t("evalsDescPage")} eyebrow={t("title")} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<FlaskConical aria-hidden />}
          title={t("noEvals")}
          description={t("noEvalsHint")}
          action={<CopyButton value="pnpm eval" />}
        />
      ) : null}

      {rows.map((r, idx) => {
        const { metrics, meta, failed } = parseEvalSummary(r.summary);
        return (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {r.suite}
                    {idx === 0 ? <Badge tone="brand">{t("lastEval")}</Badge> : null}
                  </CardTitle>
                  <CardDescription>{fmtDateTime(r.createdAt)}</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {failed === 0 ? (
                    <StatusBadge tone="ok" dot>
                      {t("evalStatusPass")}
                    </StatusBadge>
                  ) : (
                    <Badge tone="danger" dot>
                      {t("evalStatusFail", { n: failed })}
                    </Badge>
                  )}
                  <Badge tone={meta.mock ? "warn" : "info"}>{meta.mock ? t("mockRun") : t("liveRun")}</Badge>
                </div>
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                {meta.fixtures != null ? <li className="num">{t("evalFixtures", { n: meta.fixtures })}</li> : null}
                {meta.hsLines != null ? <li className="num">{t("evalHsLines", { n: meta.hsLines })}</li> : null}
                {meta.totalMs != null ? <li className="num">{t("evalDuration", { s: (meta.totalMs / 1000).toFixed(1) })}</li> : null}
                {meta.tariff ? <li>{t("evalTariff", { name: meta.tariff })}</li> : null}
              </ul>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {metrics.map((m) => (
                  <EvalMetricBar key={m.key} metric={m} />
                ))}
              </div>

              <details className="group rounded-lg border bg-muted/30">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                  {t("details")}
                </summary>
                <div className="space-y-3 border-t p-3">
                  <pre tabIndex={0} className="scrollbar-thin max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
                    {JSON.stringify(r.summary, null, 2)}
                  </pre>
                  <pre tabIndex={0} className="scrollbar-thin max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
                    {JSON.stringify(r.details, null, 2)}
                  </pre>
                </div>
              </details>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
