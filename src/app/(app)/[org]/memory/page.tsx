import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Field, Input, Select, Table, Th, Td, Badge } from "@/components/ui/primitives";
import { SubmitButton, ConfirmSubmit } from "@/components/ui/client";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { formatGel } from "@/lib/money";
import { todayIso } from "@/lib/utils";
import { deleteMemoryAction, updateMemoryAction, addReferencePriceAction, deleteReferencePriceAction } from "./actions";

export default async function MemoryPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await requireOrg(org);
  const t = await getTranslations("memory");
  const tc = await getTranslations("common");
  const db = await getDb();
  const mem = await db.select().from(schema.clientMemory).where(eq(schema.clientMemory.organizationId, ctx.org.id)).orderBy(desc(schema.clientMemory.lastConfirmedAt));
  const refs = await db.select().from(schema.priceReferences).where(eq(schema.priceReferences.organizationId, ctx.org.id)).orderBy(desc(schema.priceReferences.observedAt)).limit(200);
  const canEdit = ctx.role !== "viewer";
  const update = updateMemoryAction.bind(null, ctx.org.slug);
  const addRef = addReferencePriceAction.bind(null, ctx.org.slug);
  return (
    <AppShell ctx={ctx} active="memory">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mb-4 text-sm text-slate-600">{t("intro")}</p>
      <Card>
        <CardContent className="pt-4">
          {mem.length === 0 ? (
            <p className="text-sm text-slate-500">{t("empty")}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("product")}</Th>
                  <Th>{t("hs")}</Th>
                  <Th>{t("times")}</Th>
                  <Th>{t("last")}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {mem.map((m) => (
                  <tr key={m.id}>
                    <Td>
                      <div className="font-medium">{m.descriptionRaw ?? m.productKey}</div>
                      <div className="text-xs text-slate-500">{m.productKey}</div>
                    </Td>
                    <Td>
                      {canEdit ? (
                        <form action={update} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={m.id} />
                          <Input name="hsCode" defaultValue={m.hsCode} className="h-8 w-32 num" pattern="\d{10}" />
                          <SubmitButton size="sm" variant="ghost">
                            {tc("save")}
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className="num">{m.hsCode}</span>
                      )}
                    </Td>
                    <Td>
                      <Badge tone="brand">{m.timesConfirmed}×</Badge>
                    </Td>
                    <Td className="num text-slate-600">{fmtDateTime(m.lastConfirmedAt)}</Td>
                    <Td>
                      {canEdit ? (
                        <form action={deleteMemoryAction.bind(null, ctx.org.slug, m.id)}>
                          <ConfirmSubmit variant="ghost" size="sm" message={tc("delete") + "?"}>
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

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("references")}</CardTitle>
          <CardDescription>₾/კგ ან ₾/ერთეული · ბოლო 90 დღე ითვლება · მხოლოდ შენი მონაცემები</CardDescription>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <form action={addRef} className="mb-4 grid gap-2 sm:grid-cols-6">
              <Field label={t("hs")}>
                <Input name="hsCode" pattern="\d{10}" required className="num" />
              </Field>
              <Field label="წარმ.">
                <Input name="originCountry" maxLength={2} />
              </Field>
              <Field label={t("basis")}>
                <Select name="unitBasis" defaultValue="per_kg">
                  <option value="per_kg">₾/კგ</option>
                  <option value="per_unit">₾/ერთ.</option>
                </Select>
              </Field>
              <Field label={t("unitPrice")}>
                <Input name="unitPriceGel" inputMode="decimal" required />
              </Field>
              <Field label={t("observedAt")}>
                <Input name="observedAt" type="date" defaultValue={todayIso()} required />
              </Field>
              <div className="self-end">
                <SubmitButton variant="secondary">{t("addReference")}</SubmitButton>
              </div>
            </form>
          ) : null}
          <Table>
            <thead>
              <tr>
                <Th>{t("hs")}</Th>
                <Th>წარმ.</Th>
                <Th>{t("basis")}</Th>
                <Th>{t("unitPrice")}</Th>
                <Th>{t("observedAt")}</Th>
                <Th>წყარო</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {refs.map((r) => (
                <tr key={r.id}>
                  <Td className="num">{r.hsCode}</Td>
                  <Td>{r.originCountry ?? "—"}</Td>
                  <Td>{r.unitBasis}</Td>
                  <Td className="num">{formatGel(r.unitPriceGel, { dp: 4 })}</Td>
                  <Td className="num">{fmtDate(r.observedAt)}</Td>
                  <Td>
                    <Badge>{r.source}</Badge> {r.note ? <span className="text-xs text-slate-500">{r.note}</span> : null}
                  </Td>
                  <Td>
                    {canEdit && r.source === "user_reference" ? (
                      <form action={deleteReferencePriceAction.bind(null, ctx.org.slug, r.id)}>
                        <ConfirmSubmit variant="ghost" size="sm" message={tc("delete") + "?"}>
                          {tc("delete")}
                        </ConfirmSubmit>
                      </form>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
