import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowRight, Calculator, CalendarDays, Coins, FileClock, Landmark, Scale } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { Alert, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Explain } from "@/components/ui/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CalcKpis } from "@/components/shipment/calc-kpis";
import { CalcChart } from "@/components/shipment/calc-chart";
import { CalcBreakdown, FeeCompare, type BreakdownRow } from "@/components/shipment/calc-breakdown";
import { CalcControls, FxMissing } from "@/components/shipment/calc-controls";
import { fmtDate } from "@/lib/format";
import { shipmentPage } from "../_lib";
import { calculateAction, fetchNbgAction, manualRateAction, setRegistrationDateAction } from "../../actions";

export default async function CalcPage({ params, searchParams }: { params: Promise<{ org: string; id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const sp = await searchParams;
  const t = await getTranslations("calc");
  const tc = await getTranslations("common");
  const db = await getDb();
  const slug = ctx.org.slug;
  const sid = full.shipment.id;
  const calc = full.calculation;
  const tariff = calc ? await db.query.tariffVersions.findFirst({ where: eq(schema.tariffVersions.id, calc.tariffVersionId) }) : null;
  const unconfirmed = full.lines.filter((l) => !full.decisionByLine.get(l.id)?.humanConfirmed).length;
  const run = calculateAction.bind(null, slug, sid);
  const fxDate = sp.date ?? full.shipment.declarationRegistrationDate ?? new Date().toISOString().slice(0, 10);
  const fetchNbg = fetchNbgAction.bind(null, slug, sid, fxDate);
  const manual = manualRateAction.bind(null, slug, sid);
  const setDate = setRegistrationDateAction.bind(null, slug, sid);

  const rows: BreakdownRow[] = (calc?.breakdown ?? []).map((b) => {
    const vr = full.decisionByLine.get(b.line_id)?.valueRisk;
    const d = full.decisionByLine.get(b.line_id);
    const risk =
      !vr || vr.level === "insufficient_data" ? (
        <Badge title={t("valueRiskInsufficient")}>{t("valueRiskInsufficientShort")}</Badge>
      ) : vr.level === "none" ? (
        <Badge tone="ok" dot title={t("valueRiskNone")}>
          {t("valueRiskNoneShort")}
        </Badge>
      ) : (
        <Badge tone={vr.level === "high" ? "danger" : "warn"} dot title={t("valueRiskWarn", { pct: String(vr.deviation_pct ?? "").replace("-", ""), median: vr.own_median ?? "", basis: t(`basis_${vr.basis === "none" ? "per_unit" : vr.basis}`), n: vr.n })}>
          {vr.level} · {vr.deviation_pct}%
        </Badge>
      );
    return {
      lineId: b.line_id,
      lineNo: b.line_no,
      hsCode: b.hs_code,
      description: b.description,
      invoiceValueGel: b.invoice_value_gel,
      freightGel: b.freight_alloc_gel,
      insuranceGel: b.insurance_alloc_gel,
      otherGel: b.other_alloc_gel,
      customsValue: b.customs_value_gel,
      dutyRate: b.duty_rate,
      duty: b.duty_gel,
      excise: b.excise_gel,
      vatBase: b.vat_base_gel,
      vat: b.vat_gel,
      total: b.total_gel,
      penalty: d?.penaltyExposureGel ?? null,
      formulas: b.formulas,
      risk,
    };
  });

  return (
    <div className="space-y-5">
      <Stepper base={base} status={full.shipment.status} current="calc" />
      {unconfirmed > 0 ? <Alert tone="warn">{t("needsHs")}</Alert> : null}
      {sp.err === "fx_missing" ? (
        <FxMissing currency={sp.currency ?? ""} date={sp.date ?? fxDate} fetchNbg={fetchNbg} manual={manual} canEdit={canEdit} title={t("fxMissing", { currency: sp.currency ?? "", date: fmtDate(sp.date) })} />
      ) : null}
      {sp.err === "nbg_failed" ? <Alert tone="danger">NBG: {sp.msg}</Alert> : null}
      {sp.err === "unconfirmed_hs" ? <Alert tone="warn">{t("needsHs")}</Alert> : null}
      {sp.err === "no_tariff" ? <Alert tone="danger">{t("noTariff")}</Alert> : null}

      <CalcControls setDate={setDate} run={run} canEdit={canEdit} hasCalc={!!calc} blocked={unconfirmed > 0} registrationDate={full.shipment.declarationRegistrationDate ?? fxDate} />

      {calc ? (
        <>
          <CalcKpis
            data={{
              customsValue: calc.customsValueGel,
              duty: calc.dutyTotal,
              excise: calc.exciseTotal,
              vat: calc.vatTotal,
              fee: calc.feeGel,
              total: calc.totalPayableGel,
              broker: calc.brokerCostComparisonGel,
              penalty: calc.penaltyExposureTotalGel,
              valueRiskText: calc.valueRiskLevel === "none" ? t("valueRiskNone") : calc.valueRiskLevel,
              valueRiskTone: calc.valueRiskLevel === "high" ? "danger" : calc.valueRiskLevel === "medium" ? "warn" : "ok",
              valueRiskLevel: calc.valueRiskLevel,
            }}
            slots={{
              customsValue: <Explain term="customsValue">{t("customsValue")}</Explain>,
              fee: <Explain term="fee">{t("fee")}</Explain>,
              penalty: <Explain term="penalty">{t("penaltyTotal")}</Explain>,
              feeHint: (
                <>
                  {t(`feeModes.${calc.feeMode}`)}
                  {calc.feeOffHours ? ` · ${t("feeOffHours")}` : ""}
                </>
              ),
              brokerHint: t("brokerFormula", { rate: ctx.org.brokerCostPerHsGel, n: new Set(calc.breakdown.map((b) => b.hs_code)).size }),
              penaltyHint: tc("indicatorNotLegal"),
              valueRiskHint: t("valueRiskIndicator"),
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t("chartTitle")}</CardTitle>
              <CardDescription>{t("chartSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <CalcChart
                rows={calc.breakdown.map((b) => ({
                  id: b.line_id,
                  name: `#${b.line_no}`,
                  hs: b.hs_code,
                  description: b.description,
                  duty: Number(b.duty_gel),
                  excise: Number(b.excise_gel),
                  vat: Number(b.vat_gel),
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("line")}</CardTitle>
              <CardDescription>{t("breakdownHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <CalcBreakdown rows={rows} />
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="size-4 text-primary" aria-hidden />
                  {t("feeAlternatives")}
                </CardTitle>
                <CardDescription>
                  {t("feeNote")} {t("feeReverify")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FeeCompare
                  currentMode={calc.feeMode}
                  rows={calc.feeAlternatives.map((f) => ({ mode: f.mode, legalRef: f.legal_ref, fee: f.fee_gel, offHoursApplied: f.off_hours_applied, needsReverification: f.needs_reverification }))}
                />
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileClock className="size-4 text-primary" aria-hidden />
                  {t("versions")}
                </CardTitle>
                <CardDescription>{t("versionsHint")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <dl className="space-y-3 text-sm">
                  <VersionRow icon={<Landmark />} label={t("tariffVersion")}>
                    <span>
                      {tariff?.source} · <span className="num">{fmtDate(tariff?.effectiveFrom)}</span>
                    </span>
                    {tariff?.isPlaceholder ? <Badge tone="danger">{tc("placeholder")}</Badge> : null}
                  </VersionRow>
                  <VersionRow icon={<Coins />} label={t("feeSchedule")}>
                    <span className="num">{fmtDate(calc.feeScheduleEffectiveFrom)}</span>
                  </VersionRow>
                  <VersionRow icon={<CalendarDays />} label={t("fxVersion")}>
                    <span className="num">
                      {calc.fxCurrency} {calc.fxRate}
                    </span>
                    <span className="num text-muted-foreground">
                      {fmtDate(calc.fxDate)} · {calc.fxSource}
                    </span>
                  </VersionRow>
                </dl>
                <div className="rounded-lg bg-muted/60 p-3 text-xs">
                  <p className="mb-1 font-medium">{t("assumptions")}</p>
                  {calc.assumptions.length ? (
                    <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                      {calc.assumptions.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>
                <div className="mt-auto pt-1">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href={`${base}/approve`} data-testid="to-approve">
                      {t("toApprove")}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState icon={<Calculator />} title={t("notYet")} description={unconfirmed > 0 ? t("needsHs") : t("notYetHint")} />
      )}
    </div>
  );
}

function VersionRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">{children}</dd>
      </div>
    </div>
  );
}
