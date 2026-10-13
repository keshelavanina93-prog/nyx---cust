import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { BellRing, CalendarCheck, Check, ExternalLink, ListChecks } from "lucide-react";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, Checkbox, Field, Input, Select } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { GuideView } from "@/components/shipment/guide-view";
import { Checklist } from "@/components/shipment/checklist";
import { CardIconTitle } from "@/components/guide/guide-layout";
import { BreakEvenCalculator } from "@/components/onboarding/break-even";
import { computeBreakEven } from "@/components/onboarding/breakeven";
import { SadUpload } from "@/components/onboarding/sad-upload";
import { WizardShell, type WizardStepState, type WizardStepView } from "@/components/onboarding/wizard-shell";
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
  const tw = await getTranslations("wizard");
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

  // Step 1 calculator (initial values come from the query string; the client recalculates live)
  const fees = accessFees.map((f) => ({ termMonths: f.termMonths, feeGel: f.feeGel }));
  const initial = { n: sp.n ?? "12", fee: sp.fee ?? "150", term: sp.term ?? "12" };
  const calc = computeBreakEven({ declarations: initial.n, brokerFee: initial.fee, term: initial.term, fees });
  const expDays = profile.accessValidUntil ? daysBetween(todayIso(), profile.accessValidUntil) : null;
  const expiring = expDays !== null && expDays <= 14;

  async function toggle(checklistId: string, key: string, done: boolean) {
    "use server";
    const c = await requireOrg(org, ["owner", "member"]);
    const d = await getDb();
    await toggleChecklistItem(d, c.org.id, checklistId, key, done);
    revalidatePath(`/${c.org.slug}/onboarding/ecustoms`);
  }

  // wizard state is derived from the stored profile (wizardStep + the individual fields)
  const offices = profile.customsOfficeCodes;
  const extraOffice = offices.find((c) => !GE_OFFICES.some((o) => o.code === c)) ?? "";
  const doneFlags = [
    profile.wizardStep >= 1,
    profile.employeeInRegister && !!profile.employeeName,
    profile.noFeeDebtConfirmed,
    offices.length > 0,
    profile.accessStatus === "active",
    !!profile.emptySadSampleDocumentId,
  ];
  const firstOpen = doneFlags.findIndex((d) => !d);
  const stateOf = (i: number): WizardStepState => (doneFlags[i] ? "done" : i === firstOpen ? "current" : "todo");

  const steps: WizardStepView[] = [
    {
      id: "s1",
      title: t("step1"),
      state: stateOf(0),
      summary: `${t("saving")}: ${formatGel(calc.saving)}`,
      description: tw("step1Desc"),
      content: <BreakEvenCalculator fees={fees} initial={initial} />,
    },
    {
      id: "s2",
      title: t("step2"),
      state: stateOf(1),
      summary: [profile.employeeName, profile.employeeInRegister ? tw("sumInRegister") : null].filter(Boolean).join(" · ") || undefined,
      description: t("assumptionRegister"),
      inForm: true,
      content: (
        <div className="space-y-3">
          <Field label={t("employeeName")} hint={tw("noPersonalNumber")}>
            <Input name="employeeName" defaultValue={profile.employeeName ?? ""} autoComplete="off" data-testid="employee-name" />
          </Field>
          <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
            <Checkbox name="employeeInRegister" defaultChecked={profile.employeeInRegister} label={t("employeeInRegister")} data-testid="in-register" />
          </div>
        </div>
      ),
    },
    {
      id: "s3",
      title: t("step3"),
      state: stateOf(2),
      summary: profile.noFeeDebtConfirmed ? tw("sumNoDebt") : undefined,
      inForm: true,
      content: (
        <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
          <Checkbox name="noFeeDebtConfirmed" defaultChecked={profile.noFeeDebtConfirmed} label={t("noFeeDebt")} data-testid="no-debt" />
        </div>
      ),
    },
    {
      id: "s4",
      title: t("step4"),
      state: stateOf(3),
      summary: offices.length ? offices.join(", ") : undefined,
      description: (
        <>
          {t("applicationFields")}{" "}
          <a className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline" href="https://eservices.rs.ge/ServiceRequestNew.aspx?p=84" target="_blank" rel="noreferrer">
            {t("applicationLink")}
            <ExternalLink aria-hidden className="size-3.5" />
          </a>
        </>
      ),
      inForm: true,
      content: (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("offices")}</legend>
            <p className="text-xs text-muted-foreground">{tw("officesHint")}</p>
            <div className="flex flex-wrap gap-2">
              {GE_OFFICES.filter((o) => o.code !== "ECEZ").map((o) => (
                <label
                  key={o.code}
                  className="group inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-border bg-card px-3 py-1.5 text-sm transition-[border-color,background-color,transform] hover:border-primary/50 active:scale-[0.97] has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/35"
                >
                  <input type="checkbox" name="offices" value={o.code} defaultChecked={offices.includes(o.code)} className="sr-only" />
                  <Check aria-hidden className="-ml-1 size-3.5 w-0 scale-50 opacity-0 transition-all group-has-checked:w-3.5 group-has-checked:scale-100 group-has-checked:opacity-100" />
                  <span className="num font-semibold">{o.code}</span>
                  <span>{o.name_ka}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={t("goldList")}>
            <Input name="goldList" defaultValue={extraOffice} className="num max-w-48" />
          </Field>
          <Alert tone="warn">
            {t("signatureNote")} {t("otherOfficeNote")} <Badge tone="warn">{tc("unverified")}</Badge>
          </Alert>
          <p className="text-xs text-muted-foreground">{t("trainingNote")}</p>
        </div>
      ),
    },
    {
      id: "s5",
      title: t("step5"),
      state: stateOf(4),
      summary: [t(profile.accessStatus), profile.accessValidUntil ? fmtDate(profile.accessValidUntil) : null].filter(Boolean).join(" · "),
      inForm: true,
      content: (
        <div className="space-y-4">
          <div
            className={
              "flex flex-wrap items-center gap-3 rounded-xl border p-3 " +
              (profile.accessStatus === "active" ? (expiring ? "border-warning/40 bg-warning/10" : "border-success/30 bg-success/10") : "border-dashed bg-muted/40")
            }
          >
            <CalendarCheck aria-hidden className={profile.accessStatus === "active" ? (expiring ? "size-6 text-warning" : "size-6 text-success") : "size-6 text-muted-foreground"} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tw("activeUntil")}</div>
              <div className="num text-lg font-semibold">{profile.accessValidUntil ? fmtDate(profile.accessValidUntil) : "—"}</div>
            </div>
            {expDays !== null ? (
              <Badge tone={expDays < 0 ? "danger" : expiring ? "warn" : "ok"} dot>
                {expDays < 0 ? tw("expiredDaysAgo", { n: Math.abs(expDays) }) : tw("daysLeft", { n: expDays })}
              </Badge>
            ) : (
              <Badge>{tw("noDate")}</Badge>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
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
          </div>
          <input type="hidden" name="step" value={5} />
          <Alert tone="info" hideIcon>
            <span className="flex items-start gap-2">
              <BellRing aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{t("reminder")}</span>
            </span>
          </Alert>
        </div>
      ),
    },
    {
      id: "s6",
      title: t("step6"),
      state: stateOf(5),
      summary: profile.emptySadSampleDocumentId ? tw("sumSadUploaded") : undefined,
      description: t("emptySad"),
      content: (
        <div className="space-y-4">
          <GuideView blocks={emptySad} />
          {profile.emptySadSampleDocumentId ? <Alert tone="ok">{t("emptySadUploaded")}</Alert> : null}
          {canEdit ? <SadUpload action={upload} uploaded={!!profile.emptySadSampleDocumentId} /> : null}
        </div>
      ),
    },
  ];

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-soft">
      <p className="text-xs text-muted-foreground">{tw("saveHint")}</p>
      <SubmitButton data-testid="save-onboarding">{tc("save")}</SubmitButton>
    </div>
  );

  return (
    <AppShell ctx={ctx} active="onboarding">
      <PageHeader
        title={t("title")}
        description={t("intro")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={profile.accessStatus === "active" ? "ok" : profile.accessStatus === "applied" ? "info" : "warn"} dot>
              {t("accessStatus")}: {t(profile.accessStatus)}
            </Badge>
            {profile.accessValidUntil ? (
              <Badge tone={expiring ? "warn" : "neutral"}>
                {t("validUntil")}: {fmtDate(profile.accessValidUntil)}
              </Badge>
            ) : null}
          </div>
        }
      />
      {!canEdit ? <Alert tone="info" className="mb-4">{tw("viewerNote")}</Alert> : null}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <WizardShell steps={steps} formAction={canEdit ? save : undefined} formFooter={footer} />
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <CardIconTitle icon={<ListChecks />}>{tw("checklistTitle")}</CardIconTitle>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Checklist checklist={checklist} canEdit={canEdit} onToggle={toggle} />
            </CardContent>
          </Card>
          <GuideView blocks={guide} />
        </div>
      </div>
    </AppShell>
  );
}
