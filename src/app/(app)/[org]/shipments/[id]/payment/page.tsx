import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Calculator, CircleDollarSign, ListChecks, Receipt as ReceiptIcon, Wallet } from "lucide-react";
import { getDb } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { Badge, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/primitives";
import { SubmitButton, Explain, CopyButton } from "@/components/ui/client";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { GuideView } from "@/components/shipment/guide-view";
import { Checklist } from "@/components/shipment/checklist";
import { GuidePage, CardIconTitle } from "@/components/guide/guide-layout";
import { Receipt, type ReceiptRow } from "@/components/guide/receipt";
import { loadGuide } from "@/lib/content/guide";
import { ensureChecklist } from "@/lib/shipments/checklists";
import { formatGel } from "@/lib/money";
import { shipmentPage } from "../_lib";
import { markPaidAction, toggleChecklistAction } from "../../actions";

export default async function PaymentPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("guide");
  const tf = await getTranslations("flow");
  const tcalc = await getTranslations("calc");
  const db = await getDb();
  const guide = await loadGuide("payment");
  const checklist = await ensureChecklist(db, ctx.org.id, full.shipment.id, "payment");
  const paid = markPaidAction.bind(null, ctx.org.slug, full.shipment.id);
  const toggle = toggleChecklistAction.bind(null, ctx.org.slug, full.shipment.id);
  const c = full.calculation;
  const status = full.shipment.status;
  const isPaid = ["paid", "corridor_green", "corridor_blue", "corridor_yellow", "corridor_red", "released", "closed"].includes(status);

  const rows: ReceiptRow[] = c
    ? [
        { key: "duty", label: tcalc("duty"), v: c.dutyTotal },
        { key: "excise", label: tcalc("excise"), v: c.exciseTotal },
        { key: "vat", label: tcalc("vat"), v: c.vatTotal },
        { key: "fee", label: <Explain term="fee">{tcalc("fee")}</Explain>, v: c.feeGel },
        { key: "total", label: tcalc("totalPayable"), v: c.totalPayableGel, total: true },
      ].map((r) => ({ key: r.key, label: r.label, display: formatGel(r.v), copy: Number(r.v).toFixed(2), total: "total" in r ? r.total : false }))
    : [];
  const copyAll = c
    ? [
        full.shipment.assessmentNumber ? `${t("assessmentNumber")}: ${full.shipment.assessmentNumber}` : null,
        ...[
          [tcalc("duty"), c.dutyTotal],
          [tcalc("excise"), c.exciseTotal],
          [tcalc("vat"), c.vatTotal],
          [tcalc("fee"), c.feeGel],
          [tcalc("totalPayable"), c.totalPayableGel],
        ].map(([k, v]) => `${k}: ${Number(v).toFixed(2)} ₾`),
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <GuidePage
      stepper={<Stepper base={base} status={status} current="payment" />}
      icon={<Wallet />}
      title={t("paymentTitle")}
      badge={isPaid ? <Badge tone="ok" dot>{tf("paidBadge")}</Badge> : null}
      notice={t("paymentHint")}
      guide={<GuideView blocks={guide} />}
      aside={
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <CardIconTitle icon={<ReceiptIcon />}>{tf("receiptTitle")}</CardIconTitle>
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span>{tf("assessmentLabel")}:</span>
                <span className="num font-medium text-foreground">{full.shipment.assessmentNumber ?? "—"}</span>
                {full.shipment.assessmentNumber ? <CopyButton value={full.shipment.assessmentNumber} /> : null}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {c ? (
                <Receipt rows={rows} copyAllText={copyAll} copyAllLabel={tf("copyAll")} />
              ) : (
                <EmptyState
                  className="py-8"
                  icon={<Calculator />}
                  title={tf("noCalculation")}
                  description={tf("noCalculationHint")}
                  action={
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`${base}/calc`}>{tcalc("title")}</Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <CardIconTitle icon={<ListChecks />}>{t("checklist")}</CardIconTitle>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Checklist checklist={checklist} canEdit={canEdit} onToggle={toggle} />
              {canEdit && !isPaid ? (
                <form action={paid}>
                  <SubmitButton variant="success" className="w-full sm:w-auto" data-testid="mark-paid">
                    <CircleDollarSign aria-hidden />
                    {t("markPaid")} →
                  </SubmitButton>
                </form>
              ) : null}
              {isPaid ? (
                <Badge tone="ok" dot>
                  {tf("paidBadge")}
                </Badge>
              ) : null}
            </CardContent>
          </Card>
        </>
      }
    />
  );
}
