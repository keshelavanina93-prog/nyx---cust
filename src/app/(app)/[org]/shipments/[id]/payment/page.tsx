import { getTranslations } from "next-intl/server";
import { getDb } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { Alert, Card, CardContent, CardHeader, CardTitle, CardDescription, Table, Td } from "@/components/ui/primitives";
import { SubmitButton, CopyButton } from "@/components/ui/client";
import { GuideView } from "@/components/shipment/guide-view";
import { Checklist } from "@/components/shipment/checklist";
import { loadGuide } from "@/lib/content/guide";
import { ensureChecklist } from "@/lib/shipments/checklists";
import { formatGel } from "@/lib/money";
import { shipmentPage } from "../_lib";
import { markPaidAction, toggleChecklistAction } from "../../actions";

export default async function PaymentPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("guide");
  const tcalc = await getTranslations("calc");
  const db = await getDb();
  const guide = await loadGuide("payment");
  const checklist = await ensureChecklist(db, ctx.org.id, full.shipment.id, "payment");
  const paid = markPaidAction.bind(null, ctx.org.slug, full.shipment.id);
  const toggle = toggleChecklistAction.bind(null, ctx.org.slug, full.shipment.id);
  const c = full.calculation;
  const rows: [string, string][] = c
    ? [
        [tcalc("duty"), c.dutyTotal],
        [tcalc("excise"), c.exciseTotal],
        [tcalc("vat"), c.vatTotal],
        [tcalc("fee"), c.feeGel],
        [tcalc("totalPayable"), c.totalPayableGel],
      ]
    : [];
  return (
    <div className="space-y-4">
      <Stepper base={base} status={full.shipment.status} current="payment" />
      <h2 className="text-lg font-semibold">{t("paymentTitle")}</h2>
      <Alert tone="info">{t("paymentHint")}</Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tcalc("totalPayable")}</CardTitle>
            <CardDescription>შეფასების ნომერი: {full.shipment.assessmentNumber ?? "—"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <tbody>
                {rows.map(([k, v]) => (
                  <tr key={k}>
                    <Td>{k}</Td>
                    <Td className="num text-right font-medium">{formatGel(v)}</Td>
                    <Td className="text-right">
                      <CopyButton value={Number(v).toFixed(2)} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-3">
              <Checklist checklist={checklist} canEdit={canEdit} onToggle={toggle} />
            </div>
            {canEdit ? (
              <form action={paid} className="mt-3">
                <SubmitButton data-testid="mark-paid">{t("markPaid")} →</SubmitButton>
              </form>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <GuideView blocks={guide} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
