import { and, desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, Checkbox, Field, Input, Select, Table, Th, Td, Textarea } from "@/components/ui/primitives";
import { SubmitButton, ConfirmSubmit, CopyButton } from "@/components/ui/client";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/format";
import { updateOrgAction, inviteAction, setRoleAction, removeMemberAction, ensureIntakeChannelAction, updateAllowlistAction, deleteOrgAction } from "./actions";

export default async function SettingsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await requireOrg(org);
  const t = await getTranslations("settings");
  const tc = await getTranslations("common");
  const db = await getDb();
  const members = await db.select({ m: schema.memberships, u: schema.users }).from(schema.memberships).innerJoin(schema.users, eq(schema.memberships.userId, schema.users.id)).where(eq(schema.memberships.organizationId, ctx.org.id));
  const invites = await db.select().from(schema.invitations).where(eq(schema.invitations.organizationId, ctx.org.id));
  const channels = await db.select().from(schema.intakeChannels).where(eq(schema.intakeChannels.organizationId, ctx.org.id));
  const auditRows = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.organizationId, ctx.org.id))).orderBy(desc(schema.auditLog.createdAt)).limit(50);
  const isOwner = ctx.role === "owner";
  const updateOrg = updateOrgAction.bind(null, ctx.org.slug);
  const invite = inviteAction.bind(null, ctx.org.slug);
  const roles = ["owner", "member", "viewer"] as const;
  return (
    <AppShell ctx={ctx} active="settings">
      <h1 className="mb-4 text-2xl font-semibold">{t("title")}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("org")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateOrg} className="grid gap-3 sm:grid-cols-2">
              <Field label="სახელი" className="sm:col-span-2">
                <Input name="name" defaultValue={ctx.org.name} readOnly={!isOwner} required />
              </Field>
              <Field label="ს/კ">
                <Input name="taxId" defaultValue={ctx.org.taxId ?? ""} readOnly={!isOwner} />
              </Field>
              <Field label="სამართლებრივი ფორმა">
                <Input name="legalForm" defaultValue={ctx.org.legalForm ?? ""} readOnly={!isOwner} />
              </Field>
              <Field label="მისამართი" className="sm:col-span-2">
                <Input name="address" defaultValue={ctx.org.address ?? ""} readOnly={!isOwner} />
              </Field>
              <Field label="ვალუტა (ნაგულისხმევი)">
                <Input name="defaultCurrency" defaultValue={ctx.org.defaultCurrency} maxLength={3} readOnly={!isOwner} />
              </Field>
              <Field label={t("brokerCost")}>
                <Input name="brokerCostPerHsGel" defaultValue={ctx.org.brokerCostPerHsGel} inputMode="decimal" readOnly={!isOwner} />
              </Field>
              <div className="sm:col-span-2">
                <Checkbox name="isNaturalPerson" defaultChecked={ctx.org.isNaturalPerson} disabled={!isOwner} label={t("naturalPerson")} />
              </div>
              {isOwner ? (
                <div className="sm:col-span-2">
                  <SubmitButton>{tc("save")}</SubmitButton>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("team")}</CardTitle>
            <CardDescription>owner / member / viewer. ბროკერის როლი არ არსებობს.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <tbody>
                {members.map(({ m, u }) => (
                  <tr key={m.id}>
                    <Td>{u.name ?? u.email}</Td>
                    <Td className="text-xs text-slate-500">{u.email}</Td>
                    <Td>
                      {isOwner && u.id !== ctx.user.id ? (
                        <div className="flex gap-1">
                          {roles.map((r) => (
                            <form key={r} action={setRoleAction.bind(null, ctx.org.slug, m.id, r)}>
                              <Button size="sm" variant={m.role === r ? "default" : "ghost"} type="submit">
                                {t(r)}
                              </Button>
                            </form>
                          ))}
                          <form action={removeMemberAction.bind(null, ctx.org.slug, m.id)}>
                            <ConfirmSubmit size="sm" variant="ghost" message={tc("delete") + "?"}>
                              ✕
                            </ConfirmSubmit>
                          </form>
                        </div>
                      ) : (
                        <Badge>{t(m.role)}</Badge>
                      )}
                    </Td>
                  </tr>
                ))}
                {invites
                  .filter((i) => !i.acceptedAt)
                  .map((i) => (
                    <tr key={i.id}>
                      <Td className="text-slate-500">{i.email}</Td>
                      <Td className="text-xs text-slate-400">invited</Td>
                      <Td>
                        <Badge>{t(i.role)}</Badge>
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </Table>
            {isOwner ? (
              <form action={invite} className="flex flex-wrap items-end gap-2">
                <Field label={t("invite")}>
                  <Input name="email" type="email" required className="w-56" />
                </Field>
                <Field label={t("role")}>
                  <Select name="role" defaultValue="member">
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {t(r)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <SubmitButton variant="secondary">{tc("add")}</SubmitButton>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("intake")}</CardTitle>
            <CardDescription>ფაზა 2: email / Telegram / Viber. დადასტურება მხოლოდ ვებ-აპშია.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["email", "telegram", "viber"] as const).map((kind) => {
              const ch = channels.find((c) => c.kind === kind);
              const disabled = kind === "viber" && process.env.FEATURE_VIBER !== "true";
              return (
                <div key={kind} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t(kind === "email" ? "intakeEmail" : kind === "telegram" ? "intakeTelegram" : "intakeViber")}</span>
                    {ch ? <Badge tone={ch.verified ? "ok" : "warn"}>{ch.verified ? "verified" : "pending"}</Badge> : null}
                    {disabled ? <Badge>feature flag off</Badge> : null}
                    {isOwner && !disabled ? (
                      <form action={ensureIntakeChannelAction.bind(null, ctx.org.slug, kind)} className="ml-auto">
                        <SubmitButton size="sm" variant="secondary">
                          {ch ? "rotate secret" : tc("add")}
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                  {ch ? (
                    <div className="mt-2 space-y-2 text-xs">
                      {kind === "email" ? (
                        <div className="flex items-center gap-2">
                          <span className="num">{ch.addressOrChatId}</span> <CopyButton value={ch.addressOrChatId} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {t("intakeCode", { code: ch.secret })} <CopyButton value={`/start ${ch.secret}`} />
                        </div>
                      )}
                      {kind === "email" && isOwner ? (
                        <form action={updateAllowlistAction.bind(null, ctx.org.slug, ch.id)} className="space-y-1">
                          <Field label={t("allowlist")}>
                            <Textarea name="allowlist" defaultValue={ch.allowlist.join("\n")} className="min-h-16" />
                          </Field>
                          <SubmitButton size="sm" variant="ghost">
                            {tc("save")}
                          </SubmitButton>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("audit")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>{tc("date")}</Th>
                    <Th>actor</Th>
                    <Th>entity</Th>
                    <Th>action</Th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((a) => (
                    <tr key={a.id}>
                      <Td className="num text-xs">{fmtDateTime(a.createdAt)}</Td>
                      <Td className="text-xs">{a.actorType}</Td>
                      <Td className="text-xs">
                        {a.entity} <span className="text-slate-400">{a.entityId?.slice(0, 8)}</span>
                      </Td>
                      <Td className="text-xs">{a.action}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`/api/orgs/${ctx.org.slug}/export`}>
                <Button variant="secondary" size="sm">
                  {t("exportData")}
                </Button>
              </a>
              {isOwner ? (
                <form action={deleteOrgAction.bind(null, ctx.org.slug)}>
                  <ConfirmSubmit variant="danger" size="sm" message={`${t("deleteOrg")}: ${ctx.org.name}?`}>
                    {t("deleteOrg")}
                  </ConfirmSubmit>
                </form>
              ) : null}
            </div>
            <Alert tone="info" className="mt-3">
              eCustoms / rs.ge credential-ები აპში არასდროს ინახება.
            </Alert>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
