import Link from "next/link";
import { ArrowRight, Download, History } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/db/client";
import { Stepper } from "@/components/stepper";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, Table, Th, Td } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportCards } from "@/components/shipment/export-cards";
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
    <div className="space-y-5">
      <Stepper base={base} status={full.shipment.status} current="export" />
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      {!gateXls.ok ? <Alert tone="danger">{t("blocked", { reason: gateXls.reason })}</Alert> : null}

      <ExportCards sheetHref={`${base}/sheet`} sheetOk={gateXls.ok} xml={{ action: xml, ok: gateXml.ok, disabledByFlag: xmlDisabled, validated: settings.xmlValidated }} xls={{ action: xls, ok: gateXls.ok }} canEdit={canEdit} />

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-primary" aria-hidden />
            {t("history")}
          </CardTitle>
          <Badge className="num">{full.exports.length}</Badge>
        </CardHeader>
        <CardContent>
          {full.exports.length === 0 ? (
            <EmptyState icon={<Download />} title={t("historyEmpty")} description={t("historyEmptyHint")} className="py-8" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{tc("date")}</Th>
                  <Th>{t("file")}</Th>
                  <Th>{t("profile")}</Th>
                  <Th className="w-12 text-right">
                    <span className="sr-only">{tc("download")}</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {full.exports.map((e) => (
                  <tr key={e.id}>
                    <Td className="num whitespace-nowrap text-muted-foreground">{fmtDateTime(e.createdAt)}</Td>
                    <Td>
                      <a className="font-medium text-primary underline-offset-2 hover:underline" href={`/api/exports/${e.id}`}>
                        {e.fileName}
                      </a>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge>{t(`kinds.${e.kind}`)}</Badge>
                        {e.xmlProfileVersion ? <Badge tone={e.validatedAgainstRealSample ? "ok" : "warn"}>{e.xmlProfileVersion}</Badge> : null}
                      </div>
                    </Td>
                    <Td className="text-right">
                      <Button asChild variant="ghost" size="icon" className="size-8">
                        <a href={`/api/exports/${e.id}`} aria-label={`${tc("download")}: ${e.kind}`}>
                          <Download aria-hidden />
                        </a>
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild variant="secondary">
          <Link href={`${base}/ecustoms`}>
            {t("toGuide")}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
