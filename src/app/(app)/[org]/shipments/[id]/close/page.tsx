import { getTranslations } from "next-intl/server";
import { Stepper } from "@/components/stepper";
import { Alert, Card, CardContent, CardHeader, CardTitle, CardDescription, Table, Td } from "@/components/ui/primitives";
import { SubmitButton, CopyButton } from "@/components/ui/client";
import { GuideView } from "@/components/shipment/guide-view";
import { loadGuide } from "@/lib/content/guide";
import { formatGel } from "@/lib/money";
import { fmtDateTime } from "@/lib/format";
import { shipmentPage } from "../_lib";
import { markReleasedAction, closeShipmentAction } from "../../actions";

export default async function ClosePage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("guide");
  const guide = await loadGuide("close");
  const s = full.shipment;
  const released = markReleasedAction.bind(null, ctx.org.slug, s.id);
  const close = closeShipmentAction.bind(null, ctx.org.slug, s.id);
  const waybill: [string, string][] = [
    ["მიმწოდებელი", full.supplier?.name ?? s.supplierNameRaw ?? "—"],
    ["მიმღები", ctx.org.name],
    ["ს/კ", ctx.org.taxId ?? "—"],
    ["დეკლარაცია (A)", s.assessmentNumber ?? "—"],
    ["ტრანსპორტი", s.transportDocNo ?? "—"],
    ["საბაჟო ღირებულება", full.calculation ? formatGel(full.calculation.customsValueGel) : "—"],
    ["ხაზები", String(full.lines.length)],
  ];
  return (
    <div className="space-y-4">
      <Stepper base={base} status={s.status} current="close" />
      <h2 className="text-lg font-semibold">{t("closeTitle")}</h2>
      {s.status === "closed" ? <Alert tone="ok">{t("closed")}</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-5">
            <GuideView blocks={guide} />
            {canEdit && s.status !== "closed" ? (
              <div className="flex flex-wrap gap-2">
                {s.status !== "released" ? (
                  <form action={released}>
                    <SubmitButton variant="secondary" data-testid="released">
                      {t("markReleased")}
                    </SubmitButton>
                  </form>
                ) : null}
                <form action={close}>
                  <SubmitButton data-testid="close">{t("markClosed")}</SubmitButton>
                </form>
              </div>
            ) : null}
            {s.releasedAt ? <p className="text-xs text-slate-500">released: {fmtDateTime(s.releasedAt)}</p> : null}
            {s.closedAt ? <p className="text-xs text-slate-500">closed: {fmtDateTime(s.closedAt)}</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("waybill")}</CardTitle>
            <CardDescription>{t("waybillHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <tbody>
                {waybill.map(([k, v]) => (
                  <tr key={k}>
                    <Td className="text-slate-600">{k}</Td>
                    <Td className="font-medium">{v}</Td>
                    <Td className="text-right">
                      <CopyButton value={v} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
