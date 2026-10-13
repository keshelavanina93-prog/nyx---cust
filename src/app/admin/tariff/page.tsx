import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { getDb, schema } from "@/db/client";
import { Alert, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, Th, Td } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmSubmit } from "@/components/ui/client";
import { StatusBadge } from "@/components/admin/status-badge";
import { TARIFF_COLUMNS } from "@/lib/tariff/csv";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { DryRunForm } from "./dry-run-form";
import { tariffDryRunAction, tariffImportAction, activateTariffAction } from "../actions";

export default async function AdminTariffPage() {
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const db = await getDb();
  const versions = await db.select().from(schema.tariffVersions).orderBy(desc(schema.tariffVersions.importedAt));
  const active = versions.find((v) => v.isActive);
  const activeIsPlaceholder = !active || active.isPlaceholder;
  return (
    <div className="space-y-6">
      <PageHeader title={t("tariff")} description={t("tariffHint")} eyebrow={t("title")} />

      {activeIsPlaceholder ? (
        <Alert tone="warn" title={t("activePlaceholderTitle")}>
          {t("activePlaceholderBody")}
        </Alert>
      ) : null}

      <details className="group rounded-lg border bg-card px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 [&::-webkit-details-marker]:hidden">
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          {t("tariffColumns")}
        </summary>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {TARIFF_COLUMNS.map((c) => (
            <li key={c}>
              <code className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs">{c}</code>
            </li>
          ))}
        </ul>
      </details>

      <DryRunForm dryRun={tariffDryRunAction} importAction={tariffImportAction} />

      <Card>
        <CardHeader>
          <CardTitle>{t("versions")}</CardTitle>
          <CardDescription>{t("versionsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <EmptyState title={t("noVersions")} className="py-8" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("colSource")}</Th>
                  <Th>{t("colEffective")}</Th>
                  <Th>{t("colImported")}</Th>
                  <Th className="text-right">{t("colLines")}</Th>
                  <Th>{t("colChecksum")}</Th>
                  <Th>
                    <span className="sr-only">{tc("actions")}</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id} className={v.isActive ? "bg-success/10 [&:nth-child(even)]:bg-success/10" : undefined}>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{v.source}</span>
                        {v.isActive ? (
                          <StatusBadge tone="ok" dot>
                            {t("active")}
                          </StatusBadge>
                        ) : null}
                        {v.isPlaceholder ? <Badge tone="danger">{t("tariffPlaceholder")}</Badge> : null}
                      </div>
                    </Td>
                    <Td className="num whitespace-nowrap">{fmtDate(v.effectiveFrom)}</Td>
                    <Td className="num whitespace-nowrap">{fmtDateTime(v.importedAt)}</Td>
                    <Td className="num text-right">{v.lineCount}</Td>
                    <Td className="font-mono text-xs">{v.checksum.slice(0, 12)}</Td>
                    <Td className="text-right">
                      {!v.isActive ? (
                        <form action={activateTariffAction.bind(null, v.id)}>
                          <ConfirmSubmit size="sm" variant="secondary" message={t("activateConfirm")}>
                            {t("activate")}
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
