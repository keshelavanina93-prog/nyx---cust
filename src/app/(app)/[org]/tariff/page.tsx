import { getTranslations } from "next-intl/server";
import { getDb } from "@/db/client";
import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, Input, Table, Th, Td, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/client";
import { searchTariff } from "@/lib/tariff/search";
import { loadActiveTariff } from "@/lib/shipments/queries";

export default async function TariffSearchPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ q?: string }> }) {
  const { org } = await params;
  const ctx = await requireOrg(org);
  const { q = "" } = await searchParams;
  const t = await getTranslations("hs");
  const tc = await getTranslations("common");
  const db = await getDb();
  const tariff = await loadActiveTariff(db);
  const hits = q ? await searchTariff(db, q, 50) : [];
  return (
    <AppShell ctx={ctx}>
      <h1 className="mb-3 text-xl font-semibold">{t("searchTariff")}</h1>
      {tariff?.isPlaceholder ? <Badge tone="danger">{tc("placeholder")}</Badge> : null}
      <form className="my-3 flex gap-2">
        <Input name="q" defaultValue={q} placeholder="აღწერა ან კოდი" />
        <Button type="submit">{tc("search")}</Button>
      </form>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <thead>
              <tr>
                <Th>HS</Th>
                <Th>აღწერა</Th>
                <Th>{t("duty")}</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {hits.map((h) => (
                <tr key={h.id}>
                  <Td className="num font-medium">{h.hsCode}</Td>
                  <Td>
                    {h.descriptionKa}
                    <div className="text-xs text-slate-500">{h.descriptionEn}</div>
                  </Td>
                  <Td className="num">{h.dutyRate}%</Td>
                  <Td>
                    <CopyButton value={h.hsCode} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
