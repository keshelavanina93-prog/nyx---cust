import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, CardContent, Table, Th, Td } from "@/components/ui/primitives";
import { formatGel } from "@/lib/money";
import { fmtDate, daysBetween } from "@/lib/format";
import { STATUS_TONE } from "@/lib/shipments/status";
import { loadActiveTariff, loadEcustomsProfile } from "@/lib/shipments/queries";
import { todayIso } from "@/lib/utils";

export default async function DashboardPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await requireOrg(org);
  const t = await getTranslations("dashboard");
  const ts = await getTranslations("status");
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

  return (
    <AppShell ctx={ctx} active="dashboard">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {ctx.role !== "viewer" ? (
          <Link href={`${base}/shipments/new`}>
            <Button data-testid="new-shipment">{tn("newShipment")}</Button>
          </Link>
        ) : null}
      </div>
      <div className="mb-4 space-y-2">
        {tariff?.isPlaceholder ? <Alert tone="danger">{t("placeholderBanner")}</Alert> : null}
        {profile.accessStatus !== "active" ? (
          <Alert tone="warn">
            {t("accessBanner")}{" "}
            <Link className="underline" href={`${base}/onboarding/ecustoms`}>
              {tn("onboarding")} →
            </Link>
          </Alert>
        ) : expDays !== null && expDays < 0 ? (
          <Alert tone="danger">{t("accessExpired", { date: fmtDate(profile.accessValidUntil) })}</Alert>
        ) : expDays !== null && expDays <= 14 ? (
          <Alert tone="warn">{t("accessExpiring", { days: expDays, date: fmtDate(profile.accessValidUntil) })}</Alert>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="pt-5 text-slate-600">{t("empty")}</CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>{t("reference")}</Th>
                <Th>{t("supplier")}</Th>
                <Th className="text-right">{t("totalPayable")}</Th>
                <Th className="text-right">{t("vsBroker")}</Th>
                <Th className="text-right">{t("penaltyRisk")}</Th>
                <Th>{t("created")}</Th>
                <Th>{ts("draft") ? "სტატუსი" : ""}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const c = latestCalc.get(s.id);
                const pen = c ? Number(c.penaltyExposureTotalGel) : null;
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`${base}/shipments/${s.id}`} className="font-medium text-brand-700 underline-offset-2 hover:underline">
                        {s.reference}
                      </Link>
                    </Td>
                    <Td className="text-slate-600">{s.supplierNameRaw ?? "—"}</Td>
                    <Td className="num text-right">{c ? formatGel(c.totalPayableGel) : "—"}</Td>
                    <Td className="num text-right text-green-800">{c ? `−${formatGel(c.brokerCostComparisonGel)}` : "—"}</Td>
                    <Td className="num text-right">{pen === null ? "—" : <Badge tone={pen === 0 ? "ok" : "warn"}>{formatGel(pen)}</Badge>}</Td>
                    <Td className="num text-slate-600">{fmtDate(s.createdAt)}</Td>
                    <Td>
                      <Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{ts(s.status)}</Badge>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </AppShell>
  );
}
