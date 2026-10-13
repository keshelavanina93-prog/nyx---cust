import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { PageHeader } from "@/components/ui/page-header";
import { AiRunsTable } from "@/components/admin/ai-runs-table";
import { fmtDateTime } from "@/lib/format";

const LIMIT = 200;

export default async function AiRunsPage() {
  const t = await getTranslations("admin");
  const db = await getDb();
  const rows = await db.select().from(schema.aiRuns).orderBy(desc(schema.aiRuns.createdAt)).limit(LIMIT);
  return (
    <div className="space-y-6">
      <PageHeader title={t("aiRuns")} description={t("aiRunsDescPage", { n: LIMIT })} eyebrow={t("title")} />
      <AiRunsTable
        rows={rows.map((r) => ({
          id: r.id,
          when: fmtDateTime(r.createdAt),
          purpose: r.purpose,
          model: r.model,
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
          latencyMs: r.latencyMs,
          costUsd: r.costUsd == null ? null : String(r.costUsd),
          error: r.error,
        }))}
      />
    </div>
  );
}
