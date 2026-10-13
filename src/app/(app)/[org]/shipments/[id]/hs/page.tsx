import Link from "next/link";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { Alert, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { HsLine } from "@/components/shipment/hs-line";
import { loadSettings } from "@/lib/shipments/queries";
import { fmtDateTime } from "@/lib/format";
import { formatGel } from "@/lib/money";
import { shipmentPage } from "../_lib";
import { classifyAction, confirmHsAction, unconfirmHsAction, setManualHsAction, confirmAllGreenAction, goToCalcAction } from "../../actions";

export default async function HsPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("hs");
  const db = await getDb();
  const settings = await loadSettings(db);
  const rsFees = await db.select().from(schema.rsServiceFees);
  const userIds = [...new Set(full.decisions.map((d) => d.confirmedBy).filter((x): x is string => !!x))];
  const users = userIds.length ? await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, userIds[0]!)) : [];
  const userName = (id: string | null) => users.find((u) => u.id === id)?.name ?? users.find((u) => u.id === id)?.email ?? null;
  const slug = ctx.org.slug;
  const sid = full.shipment.id;
  const unconfirmed = full.lines.filter((l) => !full.decisionByLine.get(l.id)?.humanConfirmed);
  const needClassify = full.lines.filter((l) => !full.decisionByLine.get(l.id));
  const classifyAll = classifyAction.bind(null, slug, sid, undefined);
  const confirmGreen = confirmAllGreenAction.bind(null, slug, sid);
  const toCalc = goToCalcAction.bind(null, slug, sid);

  async function confirm(lineId: string, hsCode: string) {
    "use server";
    await confirmHsAction(slug, sid, lineId, hsCode);
  }
  async function unconfirm(lineId: string) {
    "use server";
    await unconfirmHsAction(slug, sid, lineId);
  }
  async function manual(formData: FormData) {
    "use server";
    await setManualHsAction(slug, sid, formData);
  }
  async function reclassify(lineId: string) {
    "use server";
    await classifyAction(slug, sid, lineId);
  }

  return (
    <div className="space-y-4">
      <Stepper base={base} status={full.shipment.status} current="hs" />
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        {unconfirmed.length ? <Badge tone="warn">{t("unconfirmed", { n: unconfirmed.length })}</Badge> : full.lines.length ? <Badge tone="ok">{t("allConfirmed")}</Badge> : null}
        <Link href={`/${slug}/tariff`} className="text-sm text-brand-600 underline" target="_blank">
          {t("searchTariff")} ↗
        </Link>
        {canEdit ? (
          <div className="ml-auto flex flex-wrap gap-2">
            <form action={classifyAll}>
              <SubmitButton variant={needClassify.length ? "default" : "secondary"} pendingText={t("classifying")} data-testid="classify">
                {needClassify.length ? t("classify") : t("reclassify")}
              </SubmitButton>
            </form>
            <form action={confirmGreen}>
              <SubmitButton variant="secondary">{t("confirmAllGreen")}</SubmitButton>
            </form>
            <form action={toCalc}>
              <SubmitButton disabled={unconfirmed.length > 0 || full.lines.length === 0} data-testid="to-calc">
                {t("toCalc")}
              </SubmitButton>
            </form>
          </div>
        ) : (
          <Alert tone="info" className="ml-auto">
            {t("viewerCannot")}
          </Alert>
        )}
      </div>
      {full.lines.map((l) => {
        const d = full.decisionByLine.get(l.id);
        return (
          <HsLine
            key={l.id}
            orgSlug={slug}
            shipmentId={sid}
            line={{ id: l.id, lineNo: l.lineNo, descriptionRaw: l.descriptionRaw, descriptionNormalizedKa: l.descriptionNormalizedKa, quantity: l.quantity, unit: l.unit }}
            decision={
              d
                ? { candidates: d.candidates, questionsForUser: d.questionsForUser, suggestedHsCode: d.suggestedHsCode, source: d.source, memoryTimesConfirmed: d.memoryTimesConfirmed, finalHsCode: d.finalHsCode, humanConfirmed: d.humanConfirmed, confirmedAt: d.confirmedAt ? fmtDateTime(d.confirmedAt) : null, confirmedByName: userName(d.confirmedBy), penaltyExposureGel: d.penaltyExposureGel, advanceRulingRecommended: d.advanceRulingRecommended }
                : null
            }
            thresholds={{ yellow: settings.hsYellow, red: settings.hsRed }}
            canEdit={canEdit}
            rsFees={rsFees.map((f) => ({ label: f.labelKa, fee: formatGel(f.feeGel) }))}
            actions={{ confirm, unconfirm, manual, reclassify }}
          />
        );
      })}
    </div>
  );
}
