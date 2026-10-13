import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { TZDate } from "@date-fns/tz";
import { format, startOfWeek, subWeeks } from "date-fns";
import { Activity, Package, PiggyBank, PackagePlus, Wallet } from "lucide-react";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Alert, Card, CardDescription, CardHeader, CardTitle, CardContent, Stat } from "@/components/ui/primitives";
import { Reveal } from "@/components/marketing/reveal";
import { ShipmentsChart, type WeekPoint } from "@/components/dashboard/shipments-chart";
import { ShipmentsTable, type DashRow } from "@/components/dashboard/shipments-table";
import { isInProgress } from "@/components/dashboard/status-groups";
import { D, formatGel, sum } from "@/lib/money";
import { APP_TZ, fmtDate, daysBetween } from "@/lib/format";
import { loadActiveTariff, loadEcustomsProfile } from "@/lib/shipments/queries";
import { todayIso } from "@/lib/utils";

const WEEKS = 12;

export default async function DashboardPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await requireOrg(org);
  const t = await getTranslations("dashboard");
  const tn = await getTranslations("nav");
  const db = await getDb();
  const rows = await db.select().from(schema.shipments).where(eq(schema.shipments.organizationId, ctx.org.id)).orderBy(desc(schema.shipments.createdAt)).limit(100);
  const calcs = rows.length
    ? await db.select().from(schema.calculations).where(and(eq(schema.calculations.organizationId, ctx.org.id), inArray(schema.calculations.shipmentId, rows.map((r) => r.id)))).orderBy(desc(schema.calculations.version))
    : [];
  const latestCalc = new Map<string, (typeof calcs)[number]>();
  for (const c of calcs) if (!latestCalc.has(c.shipmentId)) latestCalc.set(c.shipmentId, c);
  const [tariff, profile] = await Promise.all([loadActiveTariff(db), loadEcustomsProfile(db, ctx.org.id)]);
  const today = todayIso();
  const expDays = profile.accessValidUntil ? daysBetween(today, profile.accessValidUntil) : null;
  const base = `/${ctx.org.slug}`;
  const canCreate = ctx.role !== "viewer";

  // ---- table rows (serialized for the client component) ----
  const tableRows: DashRow[] = rows.map((s) => {
    const c = latestCalc.get(s.id);
    const pen = c ? Number(c.penaltyExposureTotalGel) : null;
    return {
      id: s.id,
      reference: s.reference,
      supplier: s.supplierNameRaw ?? null,
      status: s.status,
      createdLabel: fmtDate(s.createdAt),
      totalPayable: c ? formatGel(c.totalPayableGel) : null,
      brokerSaving: c ? formatGel(c.brokerCostComparisonGel) : null,
      penaltyLabel: pen === null ? null : formatGel(pen),
      penaltyIsZero: pen === 0,
    };
  });

  // ---- KPIs ----
  const now = new TZDate(new Date(), APP_TZ);
  const monthKey = format(now, "yyyy-MM");
  const inMonth = (d: Date) => format(new TZDate(d, APP_TZ), "yyyy-MM") === monthKey;
  const live = rows.filter((s) => s.status !== "cancelled");
  const monthRows = live.filter((s) => inMonth(s.createdAt));
  const monthCalcs = monthRows.map((s) => latestCalc.get(s.id)).filter((c): c is NonNullable<typeof c> => !!c);
  const allCalcs = live.map((s) => latestCalc.get(s.id)).filter((c): c is NonNullable<typeof c> => !!c);
  const inProgress = rows.filter((s) => isInProgress(s.status)).length;
  const payableMonth = sum(monthCalcs.map((c) => D(c.totalPayableGel)));
  const saved = sum(allCalcs.map((c) => D(c.brokerCostComparisonGel)));

  // ---- shipments per week (last 12 weeks, Mon-Sun, Asia/Tbilisi) ----
  const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const weeks: WeekPoint[] = Array.from({ length: WEEKS }, (_, i) => {
    const w = subWeeks(thisWeek, WEEKS - 1 - i);
    return { key: format(w, "yyyy-MM-dd"), label: format(w, "dd.MM"), count: 0 };
  });
  const weekIndex = new Map(weeks.map((w, i) => [w.key, i]));
  for (const s of rows) {
    const i = weekIndex.get(format(startOfWeek(new TZDate(s.createdAt, APP_TZ), { weekStartsOn: 1 }), "yyyy-MM-dd"));
    if (i !== undefined) weeks[i]!.count++;
  }

  const kpis = [
    { label: t("kpiTotal"), value: String(rows.length), hint: t("kpiTotalHint", { n: monthRows.length }), icon: <Package aria-hidden />, tone: "neutral" as const },
    { label: t("kpiInProgress"), value: String(inProgress), hint: t("kpiInProgressHint"), icon: <Activity aria-hidden />, tone: "info" as const },
    { label: t("kpiPayable"), value: formatGel(payableMonth), hint: t("kpiPayableHint", { n: monthCalcs.length }), icon: <Wallet aria-hidden />, tone: "brand" as const },
    { label: t("kpiSaved"), value: formatGel(saved), hint: t("kpiSavedHint"), icon: <PiggyBank aria-hidden />, tone: "ok" as const },
  ];

  return (
    <AppShell ctx={ctx} active="dashboard">
      <PageHeader
        eyebrow={ctx.org.name}
        title={t("title")}
        description={t("subtitle")}
        actions={
          canCreate ? (
            <Button asChild data-testid="new-shipment">
              <Link href={`${base}/shipments/new`}>
                <PackagePlus aria-hidden />
                {tn("newShipment")}
              </Link>
            </Button>
          ) : null
        }
      />

      {tariff?.isPlaceholder || profile.accessStatus !== "active" || (expDays !== null && expDays <= 14) ? (
        <div className="mb-5 space-y-2">
          {tariff?.isPlaceholder ? <Alert tone="danger">{t("placeholderBanner")}</Alert> : null}
          {profile.accessStatus !== "active" ? (
            <Alert tone="warn">
              {t("accessBanner")}{" "}
              <Link className="font-medium underline" href={`${base}/onboarding/ecustoms`}>
                {tn("onboarding")} →
              </Link>
            </Alert>
          ) : expDays !== null && expDays < 0 ? (
            <Alert tone="danger">{t("accessExpired", { date: fmtDate(profile.accessValidUntil) })}</Alert>
          ) : expDays !== null && expDays <= 14 ? (
            <Alert tone="warn">{t("accessExpiring", { days: expDays, date: fmtDate(profile.accessValidUntil) })}</Alert>
          ) : null}
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Reveal key={k.label} eager delay={i * 0.06} y={10}>
            <Stat label={k.label} value={k.value} hint={k.hint} icon={k.icon} tone={k.tone} className="h-full" />
          </Reveal>
        ))}
      </div>

      {rows.length > 0 ? (
        <Reveal eager delay={0.2} y={10} className="mb-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t("chartTitle")}</CardTitle>
              <CardDescription>{t("chartDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ShipmentsChart data={weeks} />
            </CardContent>
          </Card>
        </Reveal>
      ) : null}

      <ShipmentsTable rows={tableRows} base={base} canCreate={canCreate} />
    </AppShell>
  );
}
