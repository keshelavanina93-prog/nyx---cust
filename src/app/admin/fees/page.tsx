import { asc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/primitives";
import { FeesTabs, type HoursRow, type ServiceFeeRow } from "@/components/admin/fees-tabs";
import { fmtDate } from "@/lib/format";
import { formatGel } from "@/lib/money";

export default async function AdminFeesPage() {
  const t = await getTranslations("admin");
  const db = await getDb();
  const fees = await db.select().from(schema.feeSchedules).orderBy(asc(schema.feeSchedules.mode), asc(schema.feeSchedules.valueMin));
  const wh = await db.select().from(schema.workingHours).orderBy(asc(schema.workingHours.officeCode), asc(schema.workingHours.weekday));
  const hol = await db.select().from(schema.holidays).orderBy(asc(schema.holidays.date));
  const rs = await db.select().from(schema.rsServiceFees);
  const access = await db.select().from(schema.ecustomsAccessFees);
  const pen = await db.select().from(schema.penaltyRules);

  // one row per office, one cell per weekday
  const hoursByOffice = new Map<string, HoursRow>();
  for (const w of wh) {
    const key = w.officeCode ?? "";
    const row = hoursByOffice.get(key) ?? { office: w.officeCode, days: {} };
    row.days[w.weekday] = w.opensAt && w.closesAt ? `${w.opensAt}–${w.closesAt}` : null;
    hoursByOffice.set(key, row);
  }

  const serviceFees: ServiceFeeRow[] = [
    ...rs.map<ServiceFeeRow>((r) => ({ id: r.id, kind: "rs", label: r.labelKa, amount: formatGel(r.feeGel), legalRef: r.legalRef })),
    ...access.map<ServiceFeeRow>((a) => ({ id: a.id, kind: "access", label: "", months: a.termMonths, amount: formatGel(a.feeGel), legalRef: a.legalRef })),
  ];

  const needsReverification = fees.some((f) => f.needsReverification) || hol.some((h) => h.needsReverification);

  return (
    <div className="space-y-6">
      <PageHeader title={t("fees")} description={t("feesDescPage")} eyebrow={t("title")} />
      {needsReverification ? <Alert tone="warn">{t("reverifyTip")}</Alert> : null}
      <FeesTabs
        fees={fees.map((f) => ({
          id: f.id,
          mode: f.mode,
          min: String(f.valueMin),
          max: f.valueMax == null ? null : String(f.valueMax),
          fee: formatGel(f.feeGel),
          doubles: f.doublesOffHours,
          legalRef: f.legalRef,
          needsReverification: f.needsReverification,
          effective: fmtDate(f.effectiveFrom),
        }))}
        hours={[...hoursByOffice.values()]}
        holidays={hol.map((h) => ({ id: h.id, dateLabel: fmtDate(h.date), name: h.name, needsReverification: h.needsReverification }))}
        serviceFees={serviceFees}
        penalties={pen.map((p) => ({ id: p.id, rule: p.rule, percent: String(p.percent), threshold: p.thresholdGel == null ? null : String(p.thresholdGel), legalRef: p.legalRef }))}
      />
    </div>
  );
}
