import { getTranslations } from "next-intl/server";
import { CheckCheck, FileText, Flag, History, PackageCheck } from "lucide-react";
import { Stepper } from "@/components/stepper";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, Table, Td } from "@/components/ui/primitives";
import { SubmitButton, CopyButton } from "@/components/ui/client";
import { GuideView } from "@/components/shipment/guide-view";
import { GuidePage, CardIconTitle } from "@/components/guide/guide-layout";
import { ShipmentTimeline } from "@/components/guide/shipment-timeline";
import { ToastForm } from "@/components/guide/toast-form";
import { loadGuide } from "@/lib/content/guide";
import { formatGel } from "@/lib/money";
import { fmtDateTime } from "@/lib/format";
import { shipmentPage } from "../_lib";
import { markReleasedAction, closeShipmentAction } from "../../actions";

export default async function ClosePage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("guide");
  const tf = await getTranslations("flow");
  const guide = await loadGuide("close");
  const s = full.shipment;
  const released = markReleasedAction.bind(null, ctx.org.slug, s.id);
  const close = closeShipmentAction.bind(null, ctx.org.slug, s.id);
  const isClosed = s.status === "closed";
  const isReleased = s.status === "released" || isClosed || !!s.releasedAt;

  const waybill: [string, string][] = [
    [tf("wbSupplier"), full.supplier?.name ?? s.supplierNameRaw ?? "—"],
    [tf("wbRecipient"), ctx.org.name],
    [tf("wbTaxId"), ctx.org.taxId ?? "—"],
    [tf("wbDeclaration"), s.assessmentNumber ?? "—"],
    [tf("wbTransport"), s.transportDocNo ?? "—"],
    [tf("wbCustomsValue"), full.calculation ? formatGel(full.calculation.customsValueGel) : "—"],
    [tf("wbLines"), String(full.lines.length)],
  ];
  const waybillText = waybill.map(([k, v]) => `${k}: ${v}`).join("\n");

  const extractedAt = full.documents
    .filter((d) => d.extractionStatus === "done")
    .map((d) => d.updatedAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const exportedAt = full.exports.map((e) => e.createdAt).sort((a, b) => a.getTime() - b.getTime())[0];

  return (
    <GuidePage
      stepper={<Stepper base={base} status={s.status} current="close" />}
      icon={<Flag />}
      title={t("closeTitle")}
      description={tf("closeIntro")}
      badge={isClosed ? <Badge tone="ok" dot>{tf("tl.closed")}</Badge> : null}
      guide={
        <div className="space-y-5">
          <GuideView blocks={guide} />
          <Card>
            <CardHeader>
              <CardTitle>
                <CardIconTitle icon={<History />}>{tf("timelineTitle")}</CardIconTitle>
              </CardTitle>
              <CardDescription>{tf("timelineHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ShipmentTimeline
                input={{ status: s.status, createdAt: s.createdAt, extractedAt, approvedAt: full.calculation?.approvedAt ?? null, exportedAt, releasedAt: s.releasedAt, closedAt: s.closedAt }}
                details={{ assessed: s.assessmentNumber, corridor: s.corridor ? t(s.corridor) : null }}
              />
            </CardContent>
          </Card>
        </div>
      }
      aside={
        <>
          <Card className={isClosed ? "border-success/40" : undefined}>
            <CardHeader>
              <CardTitle>
                <CardIconTitle icon={<PackageCheck />}>{tf("closeActions")}</CardIconTitle>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isClosed ? <Alert tone="ok">{t("closed")}</Alert> : null}
              {canEdit && !isClosed ? (
                <div className="flex flex-wrap gap-2">
                  {s.status !== "released" ? (
                    <ToastForm action={released} success={tf("releasedSaved")} failure={tf("saveFailed")}>
                      <SubmitButton variant="secondary" data-testid="released">
                        <PackageCheck aria-hidden />
                        {t("markReleased")}
                      </SubmitButton>
                    </ToastForm>
                  ) : null}
                  <ToastForm action={close} success={tf("closeSaved")} failure={tf("saveFailed")}>
                    <SubmitButton data-testid="close">
                      <CheckCheck aria-hidden />
                      {t("markClosed")}
                    </SubmitButton>
                  </ToastForm>
                </div>
              ) : null}
              {s.releasedAt || s.closedAt ? (
                <dl className="num grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {s.releasedAt ? (
                    <>
                      <dt>{tf("releasedAt")}</dt>
                      <dd className="text-foreground">{fmtDateTime(s.releasedAt)}</dd>
                    </>
                  ) : null}
                  {s.closedAt ? (
                    <>
                      <dt>{tf("closedAt")}</dt>
                      <dd className="text-foreground">{fmtDateTime(s.closedAt)}</dd>
                    </>
                  ) : null}
                </dl>
              ) : null}
              {!isReleased && !isClosed ? <p className="text-xs text-muted-foreground">{tf("closeNote")}</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <CardIconTitle icon={<FileText />}>{t("waybill")}</CardIconTitle>
              </CardTitle>
              <CardDescription>{t("waybillHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Table>
                <tbody>
                  {waybill.map(([k, v]) => (
                    <tr key={k}>
                      <Td className="whitespace-nowrap text-muted-foreground">{k}</Td>
                      <Td className="num break-words font-medium">{v}</Td>
                      <Td className="text-right">
                        <CopyButton value={v} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="flex justify-end">
                <CopyButton value={waybillText} label={tf("copyAll")} className="h-8 px-3 text-sm" />
              </div>
            </CardContent>
          </Card>
        </>
      }
    />
  );
}
