import { ExternalLink, FileImage, FileJson, FileText, FolderOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Stepper } from "@/components/stepper";
import { Alert, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { ConfirmSubmit } from "@/components/ui/client";
import { EmptyState } from "@/components/ui/empty-state";
import { UploadDropzone } from "@/components/shipment/upload-dropzone";
import { ExtractCta } from "@/components/shipment/extract-cta";
import { aiIsMock } from "@/lib/ai/provider";
import { fmtDateTime } from "@/lib/format";
import { shipmentPage } from "../_lib";
import { uploadDocumentAction, extractAction, cancelShipmentAction } from "../../actions";

const KINDS = ["invoice", "packing_list", "cmr", "bl", "awb", "eur1", "ct1", "form_a", "phyto", "vet", "license", "other"] as const;

function sizeLabel(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function IntakePage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("shipment");
  const upload = uploadDocumentAction.bind(null, ctx.org.slug, full.shipment.id);
  const extract = extractAction.bind(null, ctx.org.slug, full.shipment.id);
  const cancel = cancelShipmentAction.bind(null, ctx.org.slug, full.shipment.id);
  const hasInvoice = full.documents.some((d) => d.kind === "invoice");
  const kinds = KINDS.map((k) => ({ value: k, label: t(`docKinds.${k}`) }));

  return (
    <div className="space-y-5">
      <Stepper base={base} status={full.shipment.status} current="intake" />
      {aiIsMock() ? (
        <Alert tone="warn" title="AI_MOCK">
          {t("mockNotice")}
        </Alert>
      ) : null}

      <div className={canEdit ? "grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]" : ""}>
        {canEdit ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("uploadTitle")}</CardTitle>
              <CardDescription>{t("uploadSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadDropzone action={upload} kinds={kinds} />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>{t("documents")}</CardTitle>
            <Badge className="num">{full.documents.length}</Badge>
          </CardHeader>
          <CardContent>
            {full.documents.length === 0 ? (
              <EmptyState icon={<FolderOpen />} title={t("noDocuments")} description={t("noDocumentsHint")} className="py-8" />
            ) : (
              <ul className="space-y-2.5">
                {full.documents.map((d) => {
                  const isImage = d.mime.startsWith("image/");
                  const Icon = d.mime === "application/json" ? FileJson : isImage ? FileImage : FileText;
                  return (
                    <li key={d.id} className="animate-fade-in">
                      <Card interactive className="flex items-center gap-3 p-3">
                        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/api/files/${d.id}`} alt="" loading="lazy" className="size-full object-cover" />
                          ) : (
                            <Icon className="size-6" aria-hidden />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={d.kind === "invoice" ? "brand" : "neutral"}>{t(`docKinds.${d.kind}`)}</Badge>
                            <Badge tone={d.extractionStatus === "done" ? "ok" : "neutral"} dot>
                              {d.extractionStatus === "done" ? t("extDone") : t("extPending")}
                            </Badge>
                          </div>
                          <a className="flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline" href={`/api/files/${d.id}`} target="_blank" rel="noreferrer">
                            <span className="truncate">{d.fileName}</span>
                            <ExternalLink className="size-3 shrink-0" aria-hidden />
                          </a>
                          <p className="num text-xs text-muted-foreground">
                            {sizeLabel(d.sizeBytes)} · {fmtDateTime(d.createdAt)}
                          </p>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {canEdit ? (
        <>
          <ExtractCta action={extract} disabled={!hasInvoice} hasInvoice={hasInvoice} />
          <div className="flex justify-end">
            <form action={cancel}>
              <ConfirmSubmit variant="ghost" size="sm" className="text-muted-foreground hover:text-danger" message={t("cancel") + "?"}>
                {t("cancel")}
              </ConfirmSubmit>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
