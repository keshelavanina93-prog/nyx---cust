import { getTranslations } from "next-intl/server";
import { Stepper } from "@/components/stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Field, Select, Alert, Badge, Table, Th, Td } from "@/components/ui/primitives";
import { SubmitButton, ConfirmSubmit } from "@/components/ui/client";
import { aiIsMock } from "@/lib/ai/provider";
import { fmtDateTime } from "@/lib/format";
import { shipmentPage } from "../_lib";
import { uploadDocumentAction, extractAction, cancelShipmentAction } from "../../actions";

const KINDS = ["invoice", "packing_list", "cmr", "bl", "awb", "eur1", "ct1", "form_a", "phyto", "vet", "license", "other"] as const;

export default async function IntakePage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("shipment");
  const tc = await getTranslations("common");
  const upload = uploadDocumentAction.bind(null, ctx.org.slug, full.shipment.id);
  const extract = extractAction.bind(null, ctx.org.slug, full.shipment.id);
  const cancel = cancelShipmentAction.bind(null, ctx.org.slug, full.shipment.id);
  const hasInvoice = full.documents.some((d) => d.kind === "invoice");
  return (
    <div className="space-y-4">
      <Stepper base={base} status={full.shipment.status} current="intake" />
      {aiIsMock() ? <Alert tone="warn">{t("mockNotice")}</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("uploadInvoice")}</CardTitle>
            <CardDescription>{t("uploadMore")}</CardDescription>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <form action={upload} className="space-y-3">
                <Field label={t("docKind")}>
                  <Select name="kind" defaultValue="invoice">
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </Select>
                </Field>
                <input name="files" type="file" multiple required accept="application/pdf,image/*,.json" capture="environment" className="block w-full text-sm" data-testid="file-input" />
                <SubmitButton data-testid="upload">{tc("add")}</SubmitButton>
              </form>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("documents")}</CardTitle>
          </CardHeader>
          <CardContent>
            {full.documents.length === 0 ? (
              <p className="text-sm text-slate-500">—</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("docKind")}</Th>
                    <Th>ფაილი</Th>
                    <Th>{tc("date")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {full.documents.map((d) => (
                    <tr key={d.id}>
                      <Td>
                        <Badge>{d.kind}</Badge>
                      </Td>
                      <Td>
                        <a className="text-brand-600 underline" href={`/api/files/${d.id}`} target="_blank" rel="noreferrer">
                          {d.fileName}
                        </a>{" "}
                        <span className="text-xs text-slate-500">{Math.round(d.sizeBytes / 1024)} KB · {d.extractionStatus}</span>
                      </Td>
                      <Td className="num text-slate-600">{fmtDateTime(d.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            {canEdit ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={extract}>
                  <SubmitButton disabled={!hasInvoice} pendingText={t("extracting")} data-testid="extract">
                    {t("extract")}
                  </SubmitButton>
                </form>
                <form action={cancel}>
                  <ConfirmSubmit variant="ghost" message={t("cancel") + "?"}>
                    {t("cancel")}
                  </ConfirmSubmit>
                </form>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
