import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, Table, Th, Td } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { fmtDateTime } from "@/lib/format";
import { loadSettings } from "@/lib/shipments/queries";
import { GE_PROFILE_VERSION } from "@/lib/export/sad-xml/profiles/ge";
import { setSettingAction } from "../actions";

export default async function XmlSamplesPage() {
  const t = await getTranslations("admin");
  const db = await getDb();
  const samples = await db.select({ d: schema.documents, o: schema.organizations }).from(schema.documents).innerJoin(schema.organizations, eq(schema.documents.organizationId, schema.organizations.id)).where(eq(schema.documents.kind, "sad_xml_sample")).orderBy(desc(schema.documents.createdAt));
  const settings = await loadSettings(db);
  const toggle = setSettingAction.bind(null, "xml_validated_against_real_sample", !settings.xmlValidated);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("xmlSamples")}</h1>
      <p className="text-sm text-slate-600">{t("xmlSamplesHint")}</p>
      <Alert tone={settings.xmlValidated ? "ok" : "warn"} title={`profile ${GE_PROFILE_VERSION}`}>
        xml_validated_against_real_sample = {String(settings.xmlValidated)}. Set true only after `pnpm xml:diff` reports 0 critical AND an importer confirmed a successful import in eCustoms (brief §7).
        <form action={toggle} className="mt-2">
          <SubmitButton size="sm" variant={settings.xmlValidated ? "danger" : "secondary"}>
            {settings.xmlValidated ? "unset validated" : t("setValidated")}
          </SubmitButton>
        </form>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>samples</CardTitle>
          <CardDescription>Download, anonymize, copy to tests/fixtures/sad-xml/anon/, then: pnpm xml:diff tests/fixtures/sad-xml/anon/&lt;file&gt;.xml</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>org</Th>
                <Th>file</Th>
                <Th>uploaded</Th>
              </tr>
            </thead>
            <tbody>
              {samples.map(({ d, o }) => (
                <tr key={d.id}>
                  <Td>{o.name}</Td>
                  <Td>
                    <a className="text-brand-600 underline" href={`/api/files/${d.id}?dl=1`}>
                      {d.fileName}
                    </a>{" "}
                    <Badge>{Math.round(d.sizeBytes / 1024)} KB</Badge>
                  </Td>
                  <Td className="num">{fmtDateTime(d.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
