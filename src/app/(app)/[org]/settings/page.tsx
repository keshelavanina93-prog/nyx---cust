import { and, desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Bot, Building2, Cpu, Download, Inbox, KeyRound, Mail, MailPlus, MessageCircle, RefreshCw, ScrollText, Send, Trash2, TriangleAlert, User, Users, X } from "lucide-react";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, Checkbox, Field, Input, Table, Th, Td, Textarea } from "@/components/ui/primitives";
import { SubmitButton, ConfirmSubmit, CopyButton } from "@/components/ui/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleSegmented, type Role } from "@/components/account/role-segmented";
import { SecretField } from "@/components/account/secret-field";
import { CardIconTitle } from "@/components/guide/guide-layout";
import { ToastForm } from "@/components/guide/toast-form";
import { fmtDateTime } from "@/lib/format";
import { updateOrgAction, inviteAction, setRoleAction, removeMemberAction, ensureIntakeChannelAction, updateAllowlistAction, deleteOrgAction } from "./actions";

const TABS = ["org", "team", "intake", "audit"] as const;
const ROLES: readonly Role[] = ["owner", "member", "viewer"];

function initials(s: string) {
  const parts = s.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { org } = await params;
  const { tab } = await searchParams;
  const ctx = await requireOrg(org);
  const t = await getTranslations("settings");
  const tu = await getTranslations("settingsUi");
  const tc = await getTranslations("common");
  const db = await getDb();
  const members = await db.select({ m: schema.memberships, u: schema.users }).from(schema.memberships).innerJoin(schema.users, eq(schema.memberships.userId, schema.users.id)).where(eq(schema.memberships.organizationId, ctx.org.id));
  const invites = await db.select().from(schema.invitations).where(eq(schema.invitations.organizationId, ctx.org.id));
  const channels = await db.select().from(schema.intakeChannels).where(eq(schema.intakeChannels.organizationId, ctx.org.id));
  const auditRows = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.organizationId, ctx.org.id))).orderBy(desc(schema.auditLog.createdAt)).limit(50);
  const isOwner = ctx.role === "owner";
  const updateOrg = updateOrgAction.bind(null, ctx.org.slug);
  const invite = inviteAction.bind(null, ctx.org.slug);
  const pendingInvites = invites.filter((i) => !i.acceptedAt);
  const initialTab = (TABS as readonly string[]).includes(tab ?? "") ? (tab as (typeof TABS)[number]) : "org";
  const roleLabels: Record<Role, string> = { owner: t("owner"), member: t("member"), viewer: t("viewer") };
  const actorIcon = { user: <User aria-hidden className="size-3.5" />, ai: <Bot aria-hidden className="size-3.5" />, system: <Cpu aria-hidden className="size-3.5" /> } as const;
  const actorLabel = { user: tu("actorUser"), ai: tu("actorAi"), system: tu("actorSystem") } as const;
  const failed = tu("saveFailed");

  return (
    <AppShell ctx={ctx} active="settings">
      <PageHeader title={t("title")} description={tu("intro")} />

      <Tabs defaultValue={initialTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="org">
            <Building2 aria-hidden />
            {t("org")}
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users aria-hidden />
            {t("team")}
            <Badge className="num ml-1 px-1.5">{members.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="intake">
            <Inbox aria-hidden />
            {t("intake")}
          </TabsTrigger>
          <TabsTrigger value="audit">
            <ScrollText aria-hidden />
            {t("audit")}
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------ organization ------------------------------ */}
        <TabsContent value="org">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>
                <CardIconTitle icon={<Building2 />}>{t("org")}</CardIconTitle>
              </CardTitle>
              {!isOwner ? <CardDescription>{tu("ownerOnly")}</CardDescription> : null}
            </CardHeader>
            <CardContent>
              <ToastForm action={updateOrg} success={tu("saved")} failure={failed} className="grid gap-3 sm:grid-cols-2">
                <Field label={tu("orgName")} className="sm:col-span-2">
                  <Input name="name" defaultValue={ctx.org.name} readOnly={!isOwner} required />
                </Field>
                <Field label={tu("taxId")}>
                  <Input name="taxId" defaultValue={ctx.org.taxId ?? ""} readOnly={!isOwner} className="num" />
                </Field>
                <Field label={tu("legalForm")}>
                  <Input name="legalForm" defaultValue={ctx.org.legalForm ?? ""} readOnly={!isOwner} />
                </Field>
                <Field label={tu("address")} className="sm:col-span-2">
                  <Input name="address" defaultValue={ctx.org.address ?? ""} readOnly={!isOwner} />
                </Field>
                <Field label={tu("currency")}>
                  <Input name="defaultCurrency" defaultValue={ctx.org.defaultCurrency} maxLength={3} readOnly={!isOwner} className="uppercase" />
                </Field>
                <Field label={t("brokerCost")}>
                  <Input name="brokerCostPerHsGel" defaultValue={ctx.org.brokerCostPerHsGel} inputMode="decimal" readOnly={!isOwner} className="num" />
                </Field>
                <div className="rounded-lg border bg-muted/40 px-3 py-2.5 sm:col-span-2">
                  <Checkbox name="isNaturalPerson" defaultChecked={ctx.org.isNaturalPerson} disabled={!isOwner} label={t("naturalPerson")} />
                </div>
                {isOwner ? (
                  <div className="sm:col-span-2">
                    <SubmitButton>{tc("save")}</SubmitButton>
                  </div>
                ) : null}
              </ToastForm>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------- team ---------------------------------- */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <CardIconTitle icon={<Users />}>{t("team")}</CardIconTitle>
              </CardTitle>
              <CardDescription>{tu("teamHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <ul className="divide-y">
                {members.map(({ m, u }) => {
                  const self = u.id === ctx.user.id;
                  return (
                    <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                        {initials(u.name ?? u.email)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="truncate">{u.name ?? u.email}</span>
                          {self ? <Badge tone="brand">{tu("you")}</Badge> : null}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                      </div>
                      {isOwner && !self ? (
                        <div className="flex items-center gap-2">
                          <RoleSegmented
                            current={m.role}
                            labels={roleLabels}
                            groupLabel={`${t("role")}: ${u.name ?? u.email}`}
                            success={tu("roleSaved")}
                            failure={failed}
                            actions={{
                              owner: setRoleAction.bind(null, ctx.org.slug, m.id, "owner"),
                              member: setRoleAction.bind(null, ctx.org.slug, m.id, "member"),
                              viewer: setRoleAction.bind(null, ctx.org.slug, m.id, "viewer"),
                            }}
                          />
                          <form action={removeMemberAction.bind(null, ctx.org.slug, m.id)}>
                            <ConfirmSubmit size="icon" variant="ghost" message={`${tc("delete")}: ${u.name ?? u.email}?`} className="text-danger hover:bg-danger/10">
                              <X aria-hidden />
                              <span className="sr-only">
                                {tc("delete")}: {u.email}
                              </span>
                            </ConfirmSubmit>
                          </form>
                        </div>
                      ) : (
                        <Badge tone={m.role === "owner" ? "brand" : "neutral"}>{roleLabels[m.role]}</Badge>
                      )}
                    </li>
                  );
                })}
                {pendingInvites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 py-3 text-muted-foreground">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed">
                      <MailPlus className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 truncate text-sm">{i.email}</div>
                    <Badge tone="warn" dot>
                      {tu("invited")}
                    </Badge>
                    <Badge>{roleLabels[i.role]}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {isOwner ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <CardIconTitle icon={<MailPlus />}>{t("invite")}</CardIconTitle>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ToastForm action={invite} success={tu("invited")} failure={failed} className="space-y-3">
                  <Field label={tu("email")}>
                    <Input name="email" type="email" required autoComplete="off" className="max-w-sm" />
                  </Field>
                  <fieldset className="space-y-1.5">
                    <legend className="text-sm font-medium">{t("role")}</legend>
                    <div className="inline-flex rounded-lg bg-muted p-0.5">
                      {ROLES.map((r) => (
                        <label key={r} className="cursor-pointer">
                          <input type="radio" name="role" value={r} defaultChecked={r === "member"} className="peer sr-only" />
                          <span className="block rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-3 peer-focus-visible:ring-ring/35">
                            {roleLabels[r]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <SubmitButton variant="secondary">
                    <MailPlus aria-hidden />
                    {tc("add")}
                  </SubmitButton>
                </ToastForm>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* --------------------------------- intake --------------------------------- */}
        <TabsContent value="intake" className="space-y-4">
          <p className="max-w-3xl text-sm text-muted-foreground">{tu("intakeHint")}</p>
          <div className="grid gap-4 lg:grid-cols-3">
            {(["email", "telegram", "viber"] as const).map((kind) => {
              const ch = channels.find((c) => c.kind === kind);
              const disabled = kind === "viber" && process.env.FEATURE_VIBER !== "true";
              const Icon = kind === "email" ? Mail : kind === "telegram" ? Send : MessageCircle;
              const rotate = ensureIntakeChannelAction.bind(null, ctx.org.slug, kind);
              return (
                <Card key={kind} className={disabled ? "opacity-70" : undefined}>
                  <CardHeader>
                    <CardTitle>
                      <CardIconTitle icon={<Icon />}>{t(kind === "email" ? "intakeEmail" : kind === "telegram" ? "intakeTelegram" : "intakeViber")}</CardIconTitle>
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ch ? (
                        <Badge tone={ch.verified ? "ok" : "warn"} dot>
                          {ch.verified ? tu("verified") : tu("pending")}
                        </Badge>
                      ) : (
                        <Badge>{tu("notConfigured")}</Badge>
                      )}
                      {disabled ? <Badge tone="neutral">{tu("flagOff")}</Badge> : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ch ? (
                      kind === "email" ? (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">{tu("address")}</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="num min-w-0 break-all rounded-md border bg-muted px-2 py-1 text-xs">{ch.addressOrChatId}</code>
                            <CopyButton value={ch.addressOrChatId} />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <KeyRound aria-hidden className="size-3.5" />
                            {tu("oneTimeCode")}
                          </div>
                          <SecretField secret={ch.secret} prefix="/start " />
                          <p className="text-xs text-muted-foreground">{tu("telegramHow")}</p>
                        </div>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">{tu("channelEmpty")}</p>
                    )}

                    {kind === "email" && ch && isOwner ? (
                      <ToastForm action={updateAllowlistAction.bind(null, ctx.org.slug, ch.id)} success={tu("saved")} failure={failed} className="space-y-2">
                        <Field label={t("allowlist")} hint={tu("allowlistHint")}>
                          <Textarea name="allowlist" defaultValue={ch.allowlist.join("\n")} className="min-h-20 text-xs" />
                        </Field>
                        <SubmitButton size="sm" variant="secondary">
                          {tc("save")}
                        </SubmitButton>
                      </ToastForm>
                    ) : null}

                    {isOwner && !disabled ? (
                      ch ? (
                        <ToastForm action={rotate} success={tu("rotated")} failure={failed}>
                          <ConfirmSubmit size="sm" variant="outline" message={tu("rotateConfirm")}>
                            <RefreshCw aria-hidden />
                            {tu("rotate")}
                          </ConfirmSubmit>
                        </ToastForm>
                      ) : (
                        <ToastForm action={rotate} success={tu("channelAdded")} failure={failed}>
                          <SubmitButton size="sm">{tc("add")}</SubmitButton>
                        </ToastForm>
                      )
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Alert tone="info">{tu("credentialNote")}</Alert>
        </TabsContent>

        {/* ---------------------------------- audit --------------------------------- */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>
                <CardIconTitle icon={<ScrollText />}>{t("audit")}</CardIconTitle>
              </CardTitle>
              <CardDescription>{tu("auditHint", { n: auditRows.length })}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table stickyHeader>
                  <thead>
                    <tr>
                      <Th>{tc("date")}</Th>
                      <Th>{tu("actor")}</Th>
                      <Th>{tu("entity")}</Th>
                      <Th>{tu("action")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.map((a) => (
                      <tr key={a.id}>
                        <Td className="num whitespace-nowrap text-xs">{fmtDateTime(a.createdAt)}</Td>
                        <Td>
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                              {actorIcon[a.actorType]}
                            </span>
                            {actorLabel[a.actorType]}
                          </span>
                        </Td>
                        <Td className="text-xs">
                          {a.entity} <span className="num text-muted-foreground">{a.entityId?.slice(0, 8)}</span>
                        </Td>
                        <Td>
                          <Badge className="font-mono text-[11px]">{a.action}</Badge>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ------------------------------- danger zone ------------------------------- */}
      <Card className="mt-6 border-danger/40">
        <CardHeader>
          <CardTitle className="text-danger">
            <CardIconTitle icon={<TriangleAlert />}>{tu("dangerTitle")}</CardIconTitle>
          </CardTitle>
          <CardDescription>{tu("dangerHint")}</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div className="min-w-0">
              <div className="text-sm font-medium">{t("exportData")}</div>
              <div className="text-xs text-muted-foreground">{tu("exportHint")}</div>
            </div>
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/orgs/${ctx.org.slug}/export`}>
                <Download aria-hidden />
                {t("exportData")}
              </a>
            </Button>
          </div>
          {isOwner ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <div className="min-w-0">
                <div className="text-sm font-medium">{t("deleteOrg")}</div>
                <div className="text-xs text-muted-foreground">{tu("deleteHint")}</div>
              </div>
              <form action={deleteOrgAction.bind(null, ctx.org.slug)}>
                <ConfirmSubmit variant="destructive" size="sm" message={`${t("deleteOrg")}: ${ctx.org.name}?`}>
                  <Trash2 aria-hidden />
                  {t("deleteOrg")}
                </ConfirmSubmit>
              </form>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
