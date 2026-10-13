import { getTranslations } from "next-intl/server";
import Decimal from "decimal.js";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, Checkbox, Field, Input, Select, Stat } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { GuideView } from "@/components/shipment/guide-view";
import { Checklist } from "@/components/shipment/checklist";
import { loadGuide } from "@/lib/content/guide";
import { loadEcustomsProfile } from "@/lib/shipments/queries";
import { ensureChecklist, toggleChecklistItem } from "@/lib/shipments/checklists";
import { GE_OFFICES } from "@/db/seed/reference";
import { formatGel } from "@/lib/money";
import { fmtDate, daysBetween } from "@/lib/format";
import { todayIso } from "@/lib/utils";
import { saveOnboardingAction, uploadEmptySadAction } from "../actions";

export default async function OnboardingPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ n?: string; fee?: string; term?: string }> }) {
  const { org } = await params;
  const ctx = await requireOrg(org);
  const sp = await searchParams;
  const t = await getTranslations("onboarding");
  const tc = await getTranslations("common");
  const db = await getDb();
  const profile = await loadEcustomsProfile(db, ctx.org.id);
  const accessFees = await db.select().from(schema.ecustomsAccessFees);
  const checklist = await ensureChecklist(db, ctx.org.id, null, "ecustoms_access");
  const guide = await loadGuide("ecustoms-access");
  const emptySad = await loadGuide("empty-sad");
  const canEdit = ctx.role !== "viewer";
  const save = saveOnboardingAction.bind(null, ctx.org.slug);
  const upload = uploadEmptySadAction.bind(null, ctx.org.slug);

  // Step 1 calculator
  const n = Number(sp.n ?? 12);
  const brokerFee = new Decimal(sp.fee ?? "150");
  const term = Number(sp.term ?? 12);
  const feeRow = accessFees.find((f) => f.termMonths === term) ?? accessFees.find((f) => f.termMonths === 12);
  const accessPerYear = feeRow ? new Decimal(feeRow.feeGel).mul(12 / feeRow.termMonths) : new Decimal(500);
  const brokerYear = brokerFee.mul(n);
  const saving = brokerYear.minus(accessPerYear);
  const breakeven = brokerFee.gt(0) ? accessPerYear.div(brokerFee).ceil().toNumber() : 0;
  const expDays = profile.accessValidUntil ? daysBetween(todayIso(), profile.accessValidUntil) : null;

  async function toggle(checklistId: string, key: string, done: boolean) {
    "use server";
    const c = await requireOrg(org, ["owner", "member"]);
    const d = await getDb();
    await toggleChecklistItem(d, c.org.id, checklistId, key, done);
  }

  return (
    <AppShell ctx={ctx} active="onboarding">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">{t("intro")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={profile.accessStatus === "active" ? "ok" : profile.accessStatus === "applied" ? "info" : "warn"}>
          {t("accessStatus")}: {t(profile.accessStatus)}
        </Badge>
        {profile.accessValidUntil ? <Badge tone={expDays !== null && expDays <= 14 ? "warn" : "neutral"}>{t("validUntil")}: {fmtDate(profile.accessValidUntil)}</Badge> : null}
        <span className="text-xs text-slate-500">{t("reminder")}</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>1 · {t("step1")}</CardTitle>
              <CardDescription>200 / 300 / 500 ₾ — 3 / 6 / 12 თვე (№96 გრ. 46) vs ბროკერი 100–150 ₾ / დეკლ.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 sm:grid-cols-4" method="get">
                <Field label={t("declPerYear")}>
                  <Input name="n" type="number" min={1} defaultValue={n} />
                </Field>
                <Field label={t("brokerFee")}>
                  <Input name="fee" inputMode="decimal" defaultValue={brokerFee.toString()} />
                </Field>
                <Field label={t("term")}>
                  <Select name="term" defaultValue={String(term)}>
                    {accessFees.map((f) => (
                      <option key={f.id} value={f.termMonths}>
                        {t("months", { n: f.termMonths })} · {formatGel(f.feeGel)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="self-end">
                  <SubmitButton variant="secondary">{tc("confirm")}</SubmitButton>
                </div>
              </form>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Stat label={t("brokerYear")} value={formatGel(brokerYear)} />
                <Stat label={t("accessFee")} value={formatGel(accessPerYear)} hint={`${t("months", { n: term })}`} />
                <Stat label={t("saving")} value={formatGel(saving)} tone={saving.gt(0) ? "ok" : "warn"} hint={t("breakeven", { n: breakeven })} />
              </div>
            </CardContent>
          </Card>

          {canEdit ? (
            <form action={save} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>2 · {t("step2")}</CardTitle>
                  <CardDescription>{t("assumptionRegister")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Field label={t("employeeName")}>
                    <Input name="employeeName" defaultValue={profile.employeeName ?? ""} data-testid="employee-name" />
                  </Field>
                  <Checkbox name="employeeInRegister" defaultChecked={profile.employeeInRegister} label={t("employeeInRegister")} data-testid="in-register" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>3 · {t("step3")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Checkbox name="noFeeDebtConfirmed" defaultChecked={profile.noFeeDebtConfirmed} label={t("noFeeDebt")} data-testid="no-debt" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>4 · {t("step4")}</CardTitle>
                  <CardDescription>
                    {t("applicationFields")}{" "}
                    <a className="underline" href="https://eservices.rs.ge/ServiceRequestNew.aspx?p=84" target="_blank" rel="noreferrer">
                      {t("applicationLink")} ↗
                    </a>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Field label={t("offices")}>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {GE_OFFICES.filter((o) => o.code !== "ECEZ").map((o) => (
                        <Checkbox key={o.code} name="offices" value={o.code} defaultChecked={profile.customsOfficeCodes.includes(o.code)} label={`${o.code} · ${o.name_ka}`} />
                      ))}
                    </div>
                  </Field>
                  <Field label={t("goldList")}>
                    <Input name="goldList" defaultValue={profile.customsOfficeCodes.find((c) => !GE_OFFICES.some((o) => o.code === c)) ?? ""} />
                  </Field>
                  <Alert tone="warn">
                    {t("signatureNote")} {t("otherOfficeNote")} <Badge tone="warn">{tc("unverified")}</Badge>
                  </Alert>
                  <p className="text-xs text-slate-500">{t("trainingNote")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>5 · {t("step5")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                  <Field label={t("accessStatus")}>
                    <Select name="accessStatus" defaultValue={profile.accessStatus} data-testid="access-status">
                      <option value="none">{t("none")}</option>
                      <option value="applied">{t("applied")}</option>
                      <option value="active">{t("active")}</option>
                      <option value="expired">{t("expired")}</option>
                    </Select>
                  </Field>
                  <Field label={t("term")}>
                    <Select name="accessTermMonths" defaultValue={String(profile.accessTermMonths ?? 12)}>
                      {accessFees.map((f) => (
                        <option key={f.id} value={f.termMonths}>
                          {t("months", { n: f.termMonths })}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t("validUntil")}>
                    <Input name="accessValidUntil" type="date" defaultValue={profile.accessValidUntil ?? ""} data-testid="valid-until" />
                  </Field>
                  <input type="hidden" name="step" value={5} />
                  <div className="sm:col-span-3">
                    <SubmitButton data-testid="save-onboarding">{tc("save")}</SubmitButton>
                  </div>
                </CardContent>
              </Card>
            </form>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>6 · {t("step6")}</CardTitle>
              <CardDescription>{t("emptySad")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <GuideView blocks={emptySad} />
              {profile.emptySadSampleDocumentId ? <Alert tone="ok">{t("emptySadUploaded")}</Alert> : null}
              {canEdit ? (
                <form action={upload} className="flex flex-wrap items-center gap-2">
                  <input type="file" name="file" accept=".xml,text/xml,application/xml" required className="text-sm" />
                  <SubmitButton variant="secondary" size="sm">
                    {tc("add")}
                  </SubmitButton>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <Checklist checklist={checklist} canEdit={canEdit} onToggle={toggle} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <GuideView blocks={guide} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
