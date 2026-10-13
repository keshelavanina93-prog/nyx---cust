import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, Field, Input, Stat, Table, Th, Td } from "@/components/ui/primitives";
import { SubmitButton, Explain } from "@/components/ui/client";
import { Button } from "@/components/ui/button";
import { formatGel } from "@/lib/money";
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

  return (
    <div className="space-y-4">
      <Stepper base={base} status={full.shipment.status} current="calc" />
      {unconfirmed > 0 ? <Alert tone="warn">{t("needsHs")}</Alert> : null}
      {sp.err === "fx_missing" ? (
        <Alert tone="danger" title={t("fxMissing", { currency: sp.currency ?? "", date: fmtDate(sp.date) })}>
          {canEdit ? (
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <form action={fetchNbg}>
                <SubmitButton size="sm" variant="secondary">
                  {t("fetchNbg")}
                </SubmitButton>
              </form>
              <form action={manual} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="currency" value={sp.currency ?? ""} />
                <input type="hidden" name="date" value={sp.date ?? fxDate} />
                <Field label={`${t("manualRate")} (${sp.currency} → ₾)`}>
                  <Input name="rateGel" inputMode="decimal" required className="h-8 w-32" />
                </Field>
                <Field label={t("manualRateNote")}>
                  <Input name="note" required className="h-8 w-56" placeholder="nbg.gov.ge, 13.10.2026" />
                </Field>
                <SubmitButton size="sm">{tc("save")}</SubmitButton>
              </form>
            </div>
          ) : null}
        </Alert>
      ) : null}
      {sp.err === "nbg_failed" ? <Alert tone="danger">NBG: {sp.msg}</Alert> : null}
      {sp.err === "unconfirmed_hs" ? <Alert tone="warn">{t("needsHs")}</Alert> : null}
      {sp.err === "no_tariff" ? <Alert tone="danger">no active tariff version — /admin/tariff</Alert> : null}

      <div className="flex flex-wrap items-end gap-3">
        {canEdit ? (
          <form action={setDate} className="flex items-end gap-2">
            <Field label={<Explain term="customsValue">{t("fxVersion")} · რეგისტრაციის თარიღი</Explain>}>
              <Input type="date" name="declarationRegistrationDate" defaultValue={full.shipment.declarationRegistrationDate ?? fxDate} className="h-9" />
            </Field>
            <SubmitButton size="sm" variant="secondary">
              {t("rerun")}
            </SubmitButton>
          </form>
        ) : null}
        {canEdit ? (
          <form action={run}>
            <SubmitButton disabled={unconfirmed > 0} data-testid="calculate">
              {calc ? t("rerun") : t("run")}
            </SubmitButton>
          </form>
        ) : null}
      </div>

      {calc ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label={<Explain term="customsValue">{t("customsValue")}</Explain>} value={formatGel(calc.customsValueGel)} />
            <Stat label={t("duty")} value={formatGel(calc.dutyTotal)} />
            <Stat label={t("excise")} value={formatGel(calc.exciseTotal)} />
            <Stat label={t("vat")} value={formatGel(calc.vatTotal)} />
            <Stat label={<Explain term="fee">{t("fee")}</Explain>} value={formatGel(calc.feeGel)} hint={`${calc.feeMode}${calc.feeOffHours ? " · " + t("feeOffHours") : ""}`} />
            <Stat label={t("totalPayable")} value={formatGel(calc.totalPayableGel)} tone="brand" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={t("broker")} value={formatGel(calc.brokerCostComparisonGel)} tone="ok" hint={t("brokerFormula", { rate: ctx.org.brokerCostPerHsGel, n: new Set(calc.breakdown.map((b) => b.hs_code)).size })} />
            <Stat label={<Explain term="penalty">{t("penaltyTotal")}</Explain>} value={formatGel(calc.penaltyExposureTotalGel)} tone={Number(calc.penaltyExposureTotalGel) > 0 ? "warn" : "ok"} hint={tc("indicatorNotLegal")} />
            <Stat
              label={t("valueRisk")}
              value={calc.valueRiskLevel === "none" ? t("valueRiskNone") : calc.valueRiskLevel}
              tone={calc.valueRiskLevel === "high" ? "danger" : calc.valueRiskLevel === "medium" ? "warn" : "ok"}
              hint={t("valueRiskIndicator")}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("line")}</CardTitle>
              <CardDescription>{t("howCalculated")}: გახსენი ხაზის დეტალები.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>HS</Th>
                    <Th>{t("customsValue")}</Th>
                    <Th>{t("duty")}</Th>
                    <Th>{t("excise")}</Th>
                    <Th>{t("vat")}</Th>
                    <Th>{tc("total")}</Th>
                    <Th>{t("penaltyTotal")}</Th>
                    <Th>{t("valueRisk")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {calc.breakdown.map((b) => {
                    const d = full.decisionByLine.get(b.line_id);
                    const vr = d?.valueRisk;
                    return (
                      <tr key={b.line_id}>
                        <Td className="num">{b.line_no}</Td>
                        <Td>
                          <span className="num font-medium">{b.hs_code}</span>
                          <div className="text-xs text-slate-500">{b.description}</div>
                          <details className="mt-1 text-xs text-slate-600">
                            <summary className="cursor-pointer text-brand-600">{t("howCalculated")}</summary>
                            <ul className="mt-1 space-y-0.5">
                              {Object.entries(b.formulas).map(([k, v]) => (
                                <li key={k}>
                                  <span className="font-medium">{k}:</span> {v}
                                </li>
                              ))}
                            </ul>
                          </details>
                        </Td>
                        <Td className="num">{formatGel(b.customs_value_gel)}</Td>
                        <Td className="num">
                          {formatGel(b.duty_gel)} <span className="text-xs text-slate-500">({b.duty_rate}%)</span>
                        </Td>
                        <Td className="num">{formatGel(b.excise_gel)}</Td>
                        <Td className="num">{formatGel(b.vat_gel)}</Td>
                        <Td className="num font-medium">{formatGel(b.total_gel)}</Td>
                        <Td className="num">{d?.penaltyExposureGel ? formatGel(d.penaltyExposureGel) : "—"}</Td>
                        <Td>
                          {!vr || vr.level === "insufficient_data" ? (
                            <Badge>{t("valueRiskInsufficient")}</Badge>
                          ) : vr.level === "none" ? (
                            <Badge tone="ok">{t("valueRiskNone")}</Badge>
                          ) : (
                            <Badge tone={vr.level === "high" ? "danger" : "warn"} title={t("valueRiskWarn", { pct: String(vr.deviation_pct ?? "").replace("-", ""), median: vr.own_median ?? "", basis: t(`basis_${vr.basis === "none" ? "per_unit" : vr.basis}`), n: vr.n })}>
                              {vr.level} · {vr.deviation_pct}%
                            </Badge>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("feeAlternatives")}</CardTitle>
                <CardDescription>
                  {t("feeNote")} {t("feeReverify")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <tbody>
                    {calc.feeAlternatives.map((f) => (
                      <tr key={f.mode} className={f.mode === calc.feeMode ? "bg-brand-50/50 font-medium" : undefined}>
                        <Td>
                          {f.mode} <span className="text-xs text-slate-500">{f.legal_ref}</span>
                        </Td>
                        <Td className="num text-right">
                          {formatGel(f.fee_gel)} {f.off_hours_applied ? <Badge tone="warn">×2</Badge> : null}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("versions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>
                  {t("tariffVersion")}: {tariff?.source} · {fmtDate(tariff?.effectiveFrom)} {tariff?.isPlaceholder ? <Badge tone="danger">{tc("placeholder")}</Badge> : null}
                </div>
                <div>
                  {t("feeSchedule")}: {fmtDate(calc.feeScheduleEffectiveFrom)}
                </div>
                <div>
                  {t("fxVersion")}: {calc.fxCurrency} {calc.fxRate} · {fmtDate(calc.fxDate)} · {calc.fxSource}
                </div>
                <div className="text-xs text-slate-500">
                  {t("assumptions")}: {calc.assumptions.join(", ") || "—"}
                </div>
                <div className="pt-2">
                  <a href={`${base}/approve`}>
                    <Button data-testid="to-approve">{t("toApprove")}</Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
