import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, Checkbox, Stat } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { Checklist } from "@/components/shipment/checklist";
import { formatGel } from "@/lib/money";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { loadSettings } from "@/lib/shipments/queries";
import { ensureChecklist } from "@/lib/shipments/checklists";
import { isProduction } from "@/lib/export/run";
import { shipmentPage } from "../_lib";
import { approveAction, toggleChecklistAction } from "../../actions";

export default async function ApprovePage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("approval");
  const tcalc = await getTranslations("calc");
  const tc = await getTranslations("common");
  const db = await getDb();
  const calc = full.calculation;
  const settings = await loadSettings(db);
  const tariff = calc ? await db.query.tariffVersions.findFirst({ where: eq(schema.tariffVersions.id, calc.tariffVersionId) }) : null;
  const unconfirmed = full.lines.filter((l) => !full.decisionByLine.get(l.id)?.humanConfirmed).length;
  const yellow = full.lines.filter((l) => {
    const d = full.decisionByLine.get(l.id);
    return d && !d.humanConfirmed && Number(d.suggestedConfidence ?? 0) < settings.hsYellow;
  }).length;
  const docs = calc ? await ensureChecklist(db, ctx.org.id, full.shipment.id, "documents") : null;
  const valueRisk = calc && (calc.valueRiskLevel === "medium" || calc.valueRiskLevel === "high") ? await ensureChecklist(db, ctx.org.id, full.shipment.id, "red_corridor_value") : null;
  const approver = calc?.approvedBy ? await db.query.users.findFirst({ where: eq(schema.users.id, calc.approvedBy) }) : null;
  const versionsOk = !!calc && !!calc.tariffVersionId && !!calc.fxDate && !!calc.feeScheduleEffectiveFrom;
  const placeholderBlocked = !!tariff?.isPlaceholder && isProduction();
  const blocked = !calc || unconfirmed > 0 || !versionsOk || placeholderBlocked;
  const approve = approveAction.bind(null, ctx.org.slug, full.shipment.id);
  const toggle = toggleChecklistAction.bind(null, ctx.org.slug, full.shipment.id);

  return (
    <div className="space-y-4">
      <Stepper base={base} status={full.shipment.status} current="approve" />
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      {!calc ? <Alert tone="warn">{tcalc("needsHs")}</Alert> : null}
      {unconfirmed > 0 ? <Alert tone="danger">{t("blockedHs", { n: unconfirmed })}</Alert> : null}
      {yellow > 0 ? <Alert tone="warn">{t("blockedYellow", { n: yellow })}</Alert> : null}
      {tariff?.isPlaceholder ? <Alert tone={placeholderBlocked ? "danger" : "warn"}>{t("blockedPlaceholder")}</Alert> : null}
      {calc && !versionsOk ? <Alert tone="danger">{t("blockedVersions")}</Alert> : null}
      {calc && calc.valueRiskLevel !== "none" && calc.valueRiskLevel !== "low" ? (
        <Alert tone={calc.valueRiskLevel === "high" ? "danger" : "warn"} title={tcalc("valueRisk")}>
          {tcalc("valueRiskIndicator")} — checklist `red_corridor_value` შექმნილია (იხ. ქვემოთ).
        </Alert>
      ) : null}

      {calc ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("summary")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label={tcalc("customsValue")} value={formatGel(calc.customsValueGel)} />
              <Stat label={tcalc("duty")} value={formatGel(calc.dutyTotal)} />
              <Stat label={tcalc("excise")} value={formatGel(calc.exciseTotal)} />
              <Stat label={tcalc("vat")} value={formatGel(calc.vatTotal)} />
              <Stat label={tcalc("fee")} value={formatGel(calc.feeGel)} hint={calc.feeMode} />
              <Stat label={tcalc("totalPayable")} value={formatGel(calc.totalPayableGel)} tone="brand" />
              <Stat label={tcalc("broker")} value={formatGel(calc.brokerCostComparisonGel)} tone="ok" />
              <Stat label={tcalc("penaltyTotal")} value={formatGel(calc.penaltyExposureTotalGel)} tone={Number(calc.penaltyExposureTotalGel) > 0 ? "warn" : "ok"} hint={tc("indicatorNotLegal")} />
              <Stat label={tcalc("valueRisk")} value={calc.valueRiskLevel} tone={calc.valueRiskLevel === "high" ? "danger" : calc.valueRiskLevel === "medium" ? "warn" : "ok"} />
              <div className="sm:col-span-3 text-xs text-slate-600">
                <div>
                  {tcalc("tariffVersion")}: {tariff?.source} · {fmtDate(tariff?.effectiveFrom)} {tariff?.isPlaceholder ? <Badge tone="danger">{tc("placeholder")}</Badge> : null}
                </div>
                <div>
                  {tcalc("feeSchedule")}: №96 · {fmtDate(calc.feeScheduleEffectiveFrom)}
                </div>
                <div>
                  {tcalc("fxVersion")}: {calc.fxCurrency} {calc.fxRate} · {fmtDate(calc.fxDate)} · {calc.fxSource}
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            {docs ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("docs")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Checklist checklist={docs} canEdit={canEdit} onToggle={toggle} />
                </CardContent>
              </Card>
            ) : null}
            {valueRisk ? (
              <Card className="border-amber-300">
                <CardHeader>
                  <CardTitle>red_corridor_value</CardTitle>
                </CardHeader>
                <CardContent>
                  <Checklist checklist={valueRisk} canEdit={canEdit} onToggle={toggle} />
                </CardContent>
              </Card>
            ) : null}
          </div>
          <Card>
            <CardContent className="pt-5">
              {calc.approved ? (
                <Alert tone="ok" title={t("approved", { date: fmtDateTime(calc.approvedAt) })}>
                  {t("approvedBy", { name: approver?.name ?? approver?.email ?? "—" })}
                </Alert>
              ) : canEdit ? (
                <form action={approve} className="space-y-3">
                  <Checkbox name="attest" required label={t("attest")} data-testid="attest" />
                  <SubmitButton disabled={blocked} data-testid="approve">
                    {t("approve")}
                  </SubmitButton>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
