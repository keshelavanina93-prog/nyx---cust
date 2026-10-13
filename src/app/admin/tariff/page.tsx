import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { Badge, Card, CardContent, CardHeader, CardTitle, Table, Th, Td } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { DryRunForm } from "./dry-run-form";
import { tariffDryRunAction, tariffImportAction, activateTariffAction } from "../actions";

export default async function AdminTariffPage() {
  const t = await getTranslations("admin");
  const db = await getDb();
  const versions = await db.select().from(schema.tariffVersions).orderBy(desc(schema.tariffVersions.importedAt));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("tariff")}</h1>
      <p className="text-sm text-slate-600">
        CSV columns: hs_code, description_ka, description_en, duty_rate, duty_specific, excise_rate, excise_specific, vat_exempt, unit, requires_docs, chapter_notes, heading_notes. The file is supplied by you (RS tariff) — no scraping.
      </p>
      <DryRunForm dryRun={tariffDryRunAction} importAction={tariffImportAction} />
      <Card>
        <CardHeader>
          <CardTitle>{t("versions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>source</Th>
                <Th>effective</Th>
                <Th>imported</Th>
                <Th>lines</Th>
                <Th>checksum</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className={v.isActive ? "bg-green-50" : undefined}>
                  <Td>
                    {v.source} {v.isPlaceholder ? <Badge tone="danger">PLACEHOLDER</Badge> : null} {v.isActive ? <Badge tone="ok">{t("active")}</Badge> : null}
                  </Td>
                  <Td className="num">{fmtDate(v.effectiveFrom)}</Td>
                  <Td className="num">{fmtDateTime(v.importedAt)}</Td>
                  <Td className="num">{v.lineCount}</Td>
                  <Td className="font-mono text-xs">{v.checksum.slice(0, 12)}</Td>
                  <Td>
                    {!v.isActive ? (
                      <form action={activateTariffAction.bind(null, v.id)}>
                        <SubmitButton size="sm" variant="secondary">
                          {t("activate")}
                        </SubmitButton>
                      </form>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
