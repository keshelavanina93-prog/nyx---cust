import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/primitives";
import { fmtDateTime } from "@/lib/format";

export default async function EvalsPage() {
  const t = await getTranslations("admin");
  const db = await getDb();
  const rows = await db.select().from(schema.evalResults).orderBy(desc(schema.evalResults.createdAt)).limit(20);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("evals")}</h1>
      <p className="text-sm text-slate-600">
        `pnpm eval` runs extraction + HS classification over tests/fixtures/invoices/* and stores a summary here. Targets (brief §10): field accuracy ≥95%, HS top-3 ≥85%, &quot;code in tariff&quot; = 100%, &quot;citation present&quot; ≥95%.
      </p>
      {rows.length === 0 ? <p className="text-sm text-slate-500">— no eval results yet</p> : null}
      {rows.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <CardTitle>{r.suite}</CardTitle>
            <CardDescription>{fmtDateTime(r.createdAt)}</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(r.summary, null, 2)}</pre>
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-brand-600">details</summary>
              <pre className="mt-1 max-h-96 overflow-auto rounded bg-slate-50 p-3">{JSON.stringify(r.details, null, 2)}</pre>
            </details>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
