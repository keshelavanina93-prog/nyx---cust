import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { SuppliersView, type SupplierRow } from "@/components/account/suppliers-view";
import { INCOTERMS } from "@/lib/customs/incoterms";
import { upsertSupplierAction, deleteSupplierAction } from "./actions";

export default async function SuppliersPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await requireOrg(org);
  const t = await getTranslations("suppliers");
  const tu = await getTranslations("suppliersUi");
  const db = await getDb();
  const rows = await db.select().from(schema.suppliers).where(eq(schema.suppliers.organizationId, ctx.org.id)).orderBy(asc(schema.suppliers.name));
  const upsert = upsertSupplierAction.bind(null, ctx.org.slug);
  const canEdit = ctx.role !== "viewer";
  const view: SupplierRow[] = rows.map((s) => ({
    id: s.id,
    name: s.name,
    country: s.country,
    address: s.address,
    taxId: s.taxId,
    defaultIncoterm: s.defaultIncoterm,
    defaultCurrency: s.defaultCurrency,
    defaultOriginCountry: s.defaultOriginCountry,
    deleteAction: deleteSupplierAction.bind(null, ctx.org.slug, s.id),
  }));
  return (
    <AppShell ctx={ctx} active="suppliers">
      <PageHeader title={t("title")} description={tu("intro")} />
      <SuppliersView rows={view} canEdit={canEdit} upsert={upsert} incoterms={[...INCOTERMS]} />
    </AppShell>
  );
}
