import Link from "next/link";
import { eq } from "drizzle-orm";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, PartyPopper, ShieldAlert, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { Alert, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Checklist } from "@/components/shipment/checklist";
import { ApproveForm } from "@/components/shipment/approve-form";
import { AnimatedMoney } from "@/components/shipment/animated-number";
import { formatGel } from "@/lib/money";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { loadSettings } from "@/lib/shipments/queries";
import { ensureChecklist } from "@/lib/shipments/checklists";
import { isProduction } from "@/lib/export/run";
import { cn } from "@/lib/utils";
import { shipmentPage } from "../_lib";
import { approveAction, toggleChecklistAction } from "../../actions";

type Blocker = { key: string; level: "block" | "warn" | "ok"; text: string };

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

  // blockers as a checklist: "block" items prevent approval, "warn" items only need a look, "ok" items passed
  const blockers: Blocker[] = [];
  blockers.push(unconfirmed > 0 ? { key: "hs", level: "block", text: t("blockedHs", { n: unconfirmed }) } : { key: "hs", level: "ok", text: t("okHs") });
  if (calc) blockers.push(!versionsOk ? { key: "versions", level: "block", text: t("blockedVersions") } : { key: "versions", level: "ok", text: t("okVersions") });
  if (tariff?.isPlaceholder) blockers.push({ key: "placeholder", level: placeholderBlocked ? "block" : "warn", text: t("blockedPlaceholder") });
  if (yellow > 0) blockers.push({ key: "yellow", level: "warn", text: t("blockedYellow", { n: yellow }) });
  if (calc && calc.valueRiskLevel !== "none" && calc.valueRiskLevel !== "low") blockers.push({ key: "valueRisk", level: "warn", text: `${tcalc("valueRisk")}: ${calc.valueRiskLevel}. ${t("valueRiskChecklistCreated")}` });
  const blockCount = blockers.filter((b) => b.level === "block").length;
  const warnCount = blockers.filter((b) => b.level === "warn").length;

  return (
    <div className="space-y-5">
      <Stepper base={base} status={full.shipment.status} current="approve" />

      {!calc ? (
        <EmptyState icon={<ClipboardCheck />} title={t("title")} description={tcalc("needsHs")} action={<Button asChild variant="secondary"><Link href={`${base}/calc`}>{tcalc("title")}</Link></Button>} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
          {/* ------------------------------ receipt ------------------------------ */}
          <Card className="relative overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-info to-success" aria-hidden />
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{t("summary")}</CardTitle>
                <CardDescription className="num mt-0.5">
                  {full.shipment.reference} · v{calc.version} · {fmtDate(calc.createdAt)}
                </CardDescription>
              </div>
              {calc.approved ? (
                <Badge tone="ok" dot>
                  {t("approvedShort")}
                </Badge>
              ) : (
                <Badge tone="warn" dot>
                  {t("pending")}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="num space-y-2 text-sm">
                <ReceiptRow label={tcalc("customsValue")} value={calc.customsValueGel} muted />
                <div className="border-t border-dashed" />
                <ReceiptRow label={tcalc("duty")} value={calc.dutyTotal} />
                <ReceiptRow label={tcalc("excise")} value={calc.exciseTotal} />
                <ReceiptRow label={tcalc("vat")} value={calc.vatTotal} />
                <ReceiptRow label={`${tcalc("fee")} · ${tcalc(`feeModes.${calc.feeMode}`)}`} value={calc.feeGel} />
                <div className="border-t-2 border-dashed" />
              </dl>
              <div className="flex items-end justify-between gap-3 rounded-xl bg-accent px-4 py-3 text-accent-foreground">
                <span className="text-sm font-semibold uppercase tracking-wide">{tcalc("totalPayable")}</span>
                <AnimatedMoney value={calc.totalPayableGel} className="num text-2xl font-bold tracking-tight" />
              </div>
              <dl className="num space-y-1.5 border-t border-dashed pt-3 text-sm">
                <ReceiptRow label={tcalc("broker")} value={calc.brokerCostComparisonGel} tone="ok" />
                <ReceiptRow label={tcalc("penaltyTotal")} value={calc.penaltyExposureTotalGel} tone={Number(calc.penaltyExposureTotalGel) > 0 ? "warn" : undefined} />
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{tcalc("valueRisk")}</dt>
                  <dd>
                    <Badge tone={calc.valueRiskLevel === "high" ? "danger" : calc.valueRiskLevel === "medium" ? "warn" : "ok"} dot>
                      {calc.valueRiskLevel === "none" ? tcalc("valueRiskNoneShort") : calc.valueRiskLevel}
                    </Badge>
                  </dd>
                </div>
              </dl>
              <p className="text-[11px] text-muted-foreground">{tc("indicatorNotLegal")}</p>
              <div className="space-y-1 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium text-foreground">{tcalc("tariffVersion")}:</span> {tariff?.source} · <span className="num">{fmtDate(tariff?.effectiveFrom)}</span>
                  {tariff?.isPlaceholder ? <Badge tone="danger">{tc("placeholder")}</Badge> : null}
                </div>
                <div>
                  <span className="font-medium text-foreground">{tcalc("feeSchedule")}:</span> <span className="num">{fmtDate(calc.feeScheduleEffectiveFrom)}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">{tcalc("fxVersion")}:</span>{" "}
                  <span className="num">
                    {calc.fxCurrency} {calc.fxRate} · {fmtDate(calc.fxDate)} · {calc.fxSource}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ------------------------- blockers & actions ------------------------- */}
          <div className="space-y-5">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle>{t("conditions")}</CardTitle>
                {blockCount > 0 ? (
                  <Badge tone="danger" dot>
                    {t("blockersCount", { n: blockCount })}
                  </Badge>
                ) : warnCount > 0 ? (
                  <Badge tone="warn" dot>
                    {t("warningsCount", { n: warnCount })}
                  </Badge>
                ) : (
                  <Badge tone="ok" dot>
                    {t("allClear")}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {blockers.map((b) => (
                    <li
                      key={b.key}
                      className={cn(
                        "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm",
                        b.level === "block" && "border-danger/30 bg-danger/10",
                        b.level === "warn" && "border-warning/35 bg-warning/10",
                        b.level === "ok" && "border-success/25 bg-success/5",
                      )}
                    >
                      {b.level === "block" ? <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden /> : b.level === "warn" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />}
                      <span className="min-w-0 flex-1">
                        <span className="sr-only">{b.level === "block" ? t("levelBlock") : b.level === "warn" ? t("levelWarn") : t("levelOk")}: </span>
                        {b.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

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
              <Card className="border-warning/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="size-4 text-warning" aria-hidden />
                    {t("valueEvidence")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Checklist checklist={valueRisk} canEdit={canEdit} onToggle={toggle} />
                </CardContent>
              </Card>
            ) : null}

            {calc.approved ? (
              <Card className="border-success/40 bg-success/5">
                <CardContent className="flex flex-col gap-4 p-5 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 animate-pop-in items-center justify-center rounded-full bg-success text-success-foreground">
                      <PartyPopper className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold">{t("approved", { date: fmtDateTime(calc.approvedAt) })}</p>
                      <p className="text-sm text-muted-foreground">{t("approvedBy", { name: approver?.name ?? approver?.email ?? "—" })}</p>
                    </div>
                  </div>
                  <Button asChild className="w-full sm:w-auto sm:self-start">
                    <Link href={`${base}/export`}>
                      {t("toExport")}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : canEdit ? (
              <Card className={cn(!blocked && "border-primary/40")}>
                <CardContent className="p-5 sm:p-5">
                  <ApproveForm action={approve} blocked={blocked} />
                </CardContent>
              </Card>
            ) : (
              <Alert tone="info">{t("viewerCannot")}</Alert>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptRow({ label, value, muted, tone }: { label: string; value: string; muted?: boolean; tone?: "ok" | "warn" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn(muted ? "text-muted-foreground" : "text-foreground", tone && "text-muted-foreground")}>{label}</dt>
      <dd className={cn("font-medium", muted && "text-muted-foreground", tone === "ok" && "text-success", tone === "warn" && "text-warning")}>{formatGel(value)}</dd>
    </div>
  );
}
