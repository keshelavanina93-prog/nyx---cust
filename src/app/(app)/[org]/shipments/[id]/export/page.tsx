import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, Table, Th, Td } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { Button } from "@/components/ui/button";
import { exportGate } from "@/lib/export/run";
import { loadSettings } from "@/lib/shipments/queries";
import { fmtDateTime } from "@/lib/format";
import { shipmentPage } from "../_lib";
import { exportAction } from "../../actions";

export default async function ExportPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("export");
  const tc = await getTranslations("common");
  const db = await getDb();
  const settings = await loadSettings(db);
  const gateXml = await exportGate(db, ctx.org.id, full.shipment.id, "sad_xml");
  const gateXls = await exportGate(db, ctx.org.id, full.shipment.id, "xls");
  const xml = exportAction.bind(null, ctx.org.slug, full.shipment.id, "sad_xml");
  const xls = exportAction.bind(null, ctx.org.slug, full.shipment.id, "xls");
  const xmlDisabled = process.env.FEATURE_XML_EXPORT === "false";
  return (
    <div className="space-y-4">
      <Stepper base={base} status={full.shipment.status} current="export" />
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      {!gateXls.ok ? <Alert tone="danger">{t("blocked", { reason: gateXls.reason })}</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-brand-500">
          <CardHeader>
            <CardTitle>{t("sheet")}</CardTitle>
            <CardDescription>{t("sheetD")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`${base}/sheet`}>
              <Button disabled={!gateXls.ok} data-testid="open-sheet">
                {t("sheet")} →
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("xml")} {settings.xmlValidated ? <Badge tone="ok">{t("xmlValidated")}</Badge> : <Badge tone="warn">{tc("experimental")}</Badge>}
            </CardTitle>
            <CardDescription>{settings.xmlValidated ? "" : t("xmlD")}</CardDescription>
          </CardHeader>
          <CardContent>
            {xmlDisabled ? (
              <p className="text-sm text-slate-500">{t("disabled")}</p>
            ) : canEdit ? (
              <form action={xml}>
                <SubmitButton variant="secondary" disabled={!gateXml.ok} data-testid="export-xml">
                  {t("generate")} XML
                </SubmitButton>
              </form>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("xls")}</CardTitle>
            <CardDescription>{t("xlsD")}</CardDescription>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <form action={xls}>
                <SubmitButton variant="secondary" disabled={!gateXls.ok} data-testid="export-xls">
                  {t("generate")} XLS
                </SubmitButton>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("history")}</CardTitle>
        </CardHeader>
        <CardContent>
          {full.exports.length === 0 ? (
            <p className="text-sm text-slate-500">—</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{tc("date")}</Th>
                  <Th>ფაილი</Th>
                  <Th>{t("profile")}</Th>
                </tr>
              </thead>
              <tbody>
                {full.exports.map((e) => (
                  <tr key={e.id}>
                    <Td className="num">{fmtDateTime(e.createdAt)}</Td>
                    <Td>
                      <a className="text-brand-600 underline" href={`/api/exports/${e.id}`}>
                        {e.fileName}
                      </a>
                    </Td>
                    <Td>
                      {e.kind} {e.xmlProfileVersion ? <Badge tone={e.validatedAgainstRealSample ? "ok" : "warn"}>{e.xmlProfileVersion}</Badge> : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Link href={`${base}/ecustoms`}>
        <Button variant="secondary">{t("toGuide")} →</Button>
      </Link>
    </div>
  );
}
