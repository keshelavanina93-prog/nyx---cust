import { inArray } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { HsWorkspace, type HsItem } from "@/components/shipment/hs-workspace";
import { loadSettings } from "@/lib/shipments/queries";
import { fmtDateTime } from "@/lib/format";
import { formatGel } from "@/lib/money";
import { shipmentPage } from "../_lib";
import { classifyAction, confirmHsAction, unconfirmHsAction, setManualHsAction, confirmAllGreenAction, goToCalcAction } from "../../actions";

export default async function HsPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const db = await getDb();
  const settings = await loadSettings(db);
  const rsFees = await db.select().from(schema.rsServiceFees);
  const userIds = [...new Set(full.decisions.map((d) => d.confirmedBy).filter((x): x is string => !!x))];
  const users = userIds.length ? await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email }).from(schema.users).where(inArray(schema.users.id, userIds)) : [];
  const userName = (id: string | null) => users.find((u) => u.id === id)?.name ?? users.find((u) => u.id === id)?.email ?? null;
  const slug = ctx.org.slug;
  const sid = full.shipment.id;
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

  const items: HsItem[] = full.lines.map((l) => {
    const d = full.decisionByLine.get(l.id);
    return {
      line: { id: l.id, lineNo: l.lineNo, descriptionRaw: l.descriptionRaw, descriptionNormalizedKa: l.descriptionNormalizedKa, quantity: l.quantity, unit: l.unit },
      decision: d
        ? {
            candidates: d.candidates,
            questionsForUser: d.questionsForUser,
            suggestedHsCode: d.suggestedHsCode,
            source: d.source,
            memoryTimesConfirmed: d.memoryTimesConfirmed,
            finalHsCode: d.finalHsCode,
            humanConfirmed: d.humanConfirmed,
            confirmedAt: d.confirmedAt ? fmtDateTime(d.confirmedAt) : null,
            confirmedByName: userName(d.confirmedBy),
            penaltyExposureGel: d.penaltyExposureGel,
            advanceRulingRecommended: d.advanceRulingRecommended,
          }
        : null,
    };
  });

  return (
    <div className="space-y-4">
      <Stepper base={base} status={full.shipment.status} current="hs" />
      <HsWorkspace
        orgSlug={slug}
        shipmentId={sid}
        items={items}
        thresholds={{ yellow: settings.hsYellow, red: settings.hsRed }}
        canEdit={canEdit}
        rsFees={rsFees.map((f) => ({ label: f.labelKa, fee: formatGel(f.feeGel) }))}
        actions={{ confirm, unconfirm, manual, reclassify }}
        classifyAll={classifyAll}
        confirmGreen={confirmGreen}
        toCalc={toCalc}
      />
    </div>
  );
}
