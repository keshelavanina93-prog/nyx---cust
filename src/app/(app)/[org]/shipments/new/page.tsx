import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, Field, Input, Select, Checkbox } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { GE_OFFICES } from "@/db/seed/reference";
import { createShipmentAction } from "../actions";

export default async function NewShipmentPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await requireOrg(org, ["owner", "member"]);
  const t = await getTranslations("shipment");
  const db = await getDb();
  const suppliers = await db.select().from(schema.suppliers).where(eq(schema.suppliers.organizationId, ctx.org.id)).orderBy(asc(schema.suppliers.name));
  const action = createShipmentAction.bind(null, ctx.org.slug);
  return (
    <AppShell ctx={ctx} active="dashboard">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle className="text-xl">{t("new")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <Field label={t("reference")} hint={t("referenceHint")}>
              <Input name="reference" required data-testid="ref" />
            </Field>
            <Field label={t("supplier")}>
              <Select name="supplierId" defaultValue="">
                <option value="">{t("noSupplier")}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.country ? `(${s.country})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("destinationOffice")}>
              <Select name="destinationOffice" defaultValue="11111">
                {GE_OFFICES.map((o) => (
                  <option key={o.code} value={o.code === "ECEZ" ? "" : o.code}>
                    {o.code} · {o.name_ka}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("expectedArrival")}>
              <Input name="expectedArrival" type="date" />
            </Field>
            <Checkbox name="goodsArrived" label={t("goodsArrived")} />
            <p className="text-xs text-slate-500">{t("goodsArrivedHint")}</p>
            <SubmitButton data-testid="create-shipment">{t("create")}</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
