import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Download, Terminal } from "lucide-react";
import { getDb, schema } from "@/db/client";
import { Alert, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, Th, Td } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ValidatedSwitch } from "@/components/admin/validated-switch";
import { fmtDateTime } from "@/lib/format";
import { loadSettings } from "@/lib/shipments/queries";
import { GE_PROFILE_VERSION } from "@/lib/export/sad-xml/profiles/ge";

export default async function XmlSamplesPage() {
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const db = await getDb();
  const samples = await db
    .select({ d: schema.documents, o: schema.organizations })
    .from(schema.documents)
    .innerJoin(schema.organizations, eq(schema.documents.organizationId, schema.organizations.id))
    .where(eq(schema.documents.kind, "sad_xml_sample"))
    .orderBy(desc(schema.documents.createdAt));
  const settings = await loadSettings(db);
  const exampleFile = samples[0]?.d.fileName ?? "<file>.xml";
  const command = `pnpm xml:diff tests/fixtures/sad-xml/anon/${exampleFile}`;
  const steps = [t("instrStep1"), t("instrStep2"), t("instrStep3"), t("instrStep4")];

  return (
    <div className="space-y-6">
      <PageHeader title={t("xmlSamples")} description={t("xmlSamplesHint")} eyebrow={t("title")} />

      <Alert tone={settings.xmlValidated ? "ok" : "warn"} className={settings.xmlValidated ? "text-foreground" : undefined} title={t("xmlProfile", { version: GE_PROFILE_VERSION })}>
        <div className="space-y-3">
          <p>{t("validatedRule")}</p>
          <ValidatedSwitch initial={settings.xmlValidated} />
        </div>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("samplesTitle")}</CardTitle>
            <CardDescription>{t("samplesDesc", { count: samples.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            {samples.length === 0 ? (
              <EmptyState title={t("noSamples")} className="py-8" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("colOrg")}</Th>
                    <Th>{t("colFile")}</Th>
                    <Th>{t("colUploaded")}</Th>
                    <Th className="text-right">{t("colSize")}</Th>
                    <Th>
                      <span className="sr-only">{tc("download")}</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map(({ d, o }) => (
                    <tr key={d.id}>
                      <Td>{o.name}</Td>
                      <Td className="break-all font-mono text-xs">{d.fileName}</Td>
                      <Td className="num whitespace-nowrap text-xs">{fmtDateTime(d.createdAt)}</Td>
                      <Td className="text-right">
                        <Badge className="num">{Math.max(1, Math.round(d.sizeBytes / 1024))} KB</Badge>
                      </Td>
                      <Td className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button asChild variant="outline" size="icon" className="size-8">
                              <a href={`/api/files/${d.id}?dl=1`} download aria-label={t("downloadFile", { name: d.fileName })}>
                                <Download aria-hidden />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("downloadFile", { name: d.fileName })}</TooltipContent>
                        </Tooltip>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="size-4 text-muted-foreground" aria-hidden />
              {t("instructionsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-2 text-sm">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span aria-hidden className="num flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 break-words">{s}</span>
                </li>
              ))}
            </ol>
            <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
              <code className="block break-all font-mono text-xs leading-relaxed">{command}</code>
              <CopyButton value={command} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
