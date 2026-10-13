import { asc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { NewShipmentForm } from "@/components/shipment/new-shipment-form";
import { GE_OFFICES } from "@/db/seed/reference";
import { createShipmentAction } from "../actions";

export default async function NewShipmentPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await requireOrg(org, ["owner", "member"]);
  const t = await getTranslations("shipment");
  const locale = await getLocale();
  const db = await getDb();
  const suppliers = await db.select().from(schema.suppliers).where(eq(schema.suppliers.organizationId, ctx.org.id)).orderBy(asc(schema.suppliers.name));
  const action = createShipmentAction.bind(null, ctx.org.slug);
  return (
    <AppShell ctx={ctx} active="dashboard">
      <PageHeader title={t("new")} description={t("newSubtitle")} />
      <NewShipmentForm
        action={action}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name, country: s.country }))}
        offices={GE_OFFICES.map((o) => ({ code: o.code, name: locale === "en" ? o.name_en : o.name_ka }))}
      />
    </AppShell>
  );
}
