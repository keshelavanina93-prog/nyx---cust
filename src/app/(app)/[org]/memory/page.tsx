import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { MemoryView, type MemoryRow, type ReferenceRow } from "@/components/account/memory-view";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { formatGel } from "@/lib/money";
import { todayIso } from "@/lib/utils";
import { deleteMemoryAction, updateMemoryAction, addReferencePriceAction, deleteReferencePriceAction } from "./actions";

export default async function MemoryPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { org } = await params;
  const { tab } = await searchParams;
  const ctx = await requireOrg(org);
  const t = await getTranslations("memory");
  const db = await getDb();
  const mem = await db.select().from(schema.clientMemory).where(eq(schema.clientMemory.organizationId, ctx.org.id)).orderBy(desc(schema.clientMemory.lastConfirmedAt));
  const refs = await db.select().from(schema.priceReferences).where(eq(schema.priceReferences.organizationId, ctx.org.id)).orderBy(desc(schema.priceReferences.observedAt)).limit(200);
  const canEdit = ctx.role !== "viewer";

  const memory: MemoryRow[] = mem.map((m) => ({
    id: m.id,
    productKey: m.productKey,
    descriptionRaw: m.descriptionRaw,
    hsCode: m.hsCode,
    timesConfirmed: m.timesConfirmed,
    lastConfirmed: fmtDateTime(m.lastConfirmedAt),
    deleteAction: deleteMemoryAction.bind(null, ctx.org.slug, m.id),
  }));
  const references: ReferenceRow[] = refs.map((r) => ({
    id: r.id,
    hsCode: r.hsCode,
    originCountry: r.originCountry,
    unitBasis: r.unitBasis as ReferenceRow["unitBasis"],
    unitPrice: formatGel(r.unitPriceGel, { dp: 4 }),
    observedAt: fmtDate(r.observedAt),
    source: r.source,
    note: r.note,
    deleteAction: r.source === "user_reference" ? deleteReferencePriceAction.bind(null, ctx.org.slug, r.id) : null,
  }));

  return (
    <AppShell ctx={ctx} active="memory">
      <PageHeader title={t("title")} description={t("intro")} />
      <MemoryView
        memory={memory}
        references={references}
        canEdit={canEdit}
        update={updateMemoryAction.bind(null, ctx.org.slug)}
        addReference={addReferencePriceAction.bind(null, ctx.org.slug)}
        today={todayIso()}
        defaultTab={tab === "references" ? "references" : "memory"}
      />
    </AppShell>
  );
}
