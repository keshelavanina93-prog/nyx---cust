import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { Badge, Card, CardContent, Table, Th, Td } from "@/components/ui/primitives";
import { fmtDateTime } from "@/lib/format";

export default async function AiRunsPage() {
  const t = await getTranslations("admin");
  const db = await getDb();
  const rows = await db.select().from(schema.aiRuns).orderBy(desc(schema.aiRuns.createdAt)).limit(200);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("aiRuns")}</h1>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <thead>
              <tr>
                <Th>when</Th>
                <Th>purpose</Th>
                <Th>model</Th>
                <Th>tokens</Th>
                <Th>ms</Th>
                <Th>cost $</Th>
                <Th>error</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="num text-xs">{fmtDateTime(r.createdAt)}</Td>
                  <Td>
                    <Badge>{r.purpose}</Badge>
                  </Td>
                  <Td className="text-xs">{r.model}</Td>
                  <Td className="num text-xs">
                    {r.inputTokens ?? "—"} / {r.outputTokens ?? "—"}
                  </Td>
                  <Td className="num text-xs">{r.latencyMs}</Td>
                  <Td className="num text-xs">{r.costUsd ?? "—"}</Td>
                  <Td className="text-xs text-red-700">{r.error ?? ""}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
