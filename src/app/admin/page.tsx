import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { Card, CardContent, CardHeader, CardTitle, Stat } from "@/components/ui/primitives";

export default async function AdminHome() {
  const t = await getTranslations("admin");
  const db = await getDb();
  const [orgs] = await db.select({ n: count() }).from(schema.organizations);
  const [ships] = await db.select({ n: count() }).from(schema.shipments);
  const [runs] = await db.select({ n: count() }).from(schema.aiRuns);
  const [confirmed] = await db.select({ n: count() }).from(schema.hsDecisions).where(eq(schema.hsDecisions.humanConfirmed, true));
  const [overrides] = await db.select({ n: count() }).from(schema.hsDecisions).where(eq(schema.hsDecisions.source, "manual"));
  const tariff = await db.query.tariffVersions.findFirst({ where: eq(schema.tariffVersions.isActive, true) });
  const lastEval = await db.select().from(schema.evalResults).orderBy(desc(schema.evalResults.createdAt)).limit(1);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="orgs" value={orgs?.n ?? 0} />
        <Stat label="shipments" value={ships?.n ?? 0} />
        <Stat label="ai runs" value={runs?.n ?? 0} />
        <Stat label="HS confirmed" value={confirmed?.n ?? 0} />
        <Stat label="HS manual override" value={overrides?.n ?? 0} tone={Number(overrides?.n) > 0 ? "warn" : "ok"} />
        <Stat label="tariff" value={tariff ? (tariff.isPlaceholder ? "PLACEHOLDER" : "real") : "none"} tone={tariff?.isPlaceholder ? "danger" : "ok"} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("evals")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {lastEval[0] ? <pre className="overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(lastEval[0].summary, null, 2)}</pre> : "— run `pnpm eval`"}
          <Link href="/admin/evals" className="text-brand-600 underline">
            {t("evals")} →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
