import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, Field, Input, Select, Table, Th, Td } from "@/components/ui/primitives";
import { SubmitButton, ConfirmSubmit } from "@/components/ui/client";
import { INCOTERMS } from "@/lib/customs/incoterms";
import { upsertSupplierAction, deleteSupplierAction } from "./actions";

export default async function SuppliersPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await requireOrg(org);
  const t = await getTranslations("suppliers");
  const tc = await getTranslations("common");
  const db = await getDb();
  const rows = await db.select().from(schema.suppliers).where(eq(schema.suppliers.organizationId, ctx.org.id)).orderBy(asc(schema.suppliers.name));
  const upsert = upsertSupplierAction.bind(null, ctx.org.slug);
  const canEdit = ctx.role !== "viewer";
  return (
    <AppShell ctx={ctx} active="suppliers">
      <h1 className="mb-4 text-2xl font-semibold">{t("title")}</h1>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        {canEdit ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("add")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={upsert} className="grid gap-3 sm:grid-cols-2">
                <Field label={t("name")} className="sm:col-span-2">
                  <Input name="name" required />
                </Field>
                <Field label={t("country")}>
                  <Input name="country" maxLength={2} placeholder="TR" />
                </Field>
                <Field label={t("taxId")}>
                  <Input name="taxId" />
                </Field>
                <Field label={t("incoterm")}>
                  <Select name="defaultIncoterm" defaultValue="">
                    <option value="">—</option>
                    {INCOTERMS.map((i) => (
                      <option key={i}>{i}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("currency")}>
                  <Input name="defaultCurrency" maxLength={3} placeholder="USD" />
                </Field>
                <Field label={t("origin")}>
                  <Input name="defaultOriginCountry" maxLength={2} />
                </Field>
                <Field label={t("address")}>
                  <Input name="address" />
                </Field>
                <div className="sm:col-span-2">
                  <SubmitButton>{tc("add")}</SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardContent className="pt-4">
            {rows.length === 0 ? (
              <p className="text-sm text-slate-500">{t("empty")}</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("name")}</Th>
                    <Th>{t("country")}</Th>
                    <Th>{t("incoterm")}</Th>
                    <Th>{t("currency")}</Th>
                    <Th>{t("origin")}</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <Td className="font-medium">{s.name}</Td>
                      <Td>{s.country ?? "—"}</Td>
                      <Td>{s.defaultIncoterm ?? "—"}</Td>
                      <Td>{s.defaultCurrency ?? "—"}</Td>
                      <Td>{s.defaultOriginCountry ?? "—"}</Td>
                      <Td>
                        {canEdit ? (
                          <form action={deleteSupplierAction.bind(null, ctx.org.slug, s.id)}>
                            <ConfirmSubmit variant="ghost" size="sm" message={`${tc("delete")} ${s.name}?`}>
                              {tc("delete")}
                            </ConfirmSubmit>
                          </form>
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
