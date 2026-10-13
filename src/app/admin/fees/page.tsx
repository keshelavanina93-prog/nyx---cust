import { asc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb, schema } from "@/db/client";
import { Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, Field, Input, Table, Th, Td } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { fmtDate } from "@/lib/format";
import { formatGel } from "@/lib/money";
import { addHolidayAction, deleteHolidayAction } from "../actions";

export default async function AdminFeesPage() {
  const t = await getTranslations("admin");
  const db = await getDb();
  const fees = await db.select().from(schema.feeSchedules).orderBy(asc(schema.feeSchedules.mode), asc(schema.feeSchedules.valueMin));
  const wh = await db.select().from(schema.workingHours).orderBy(asc(schema.workingHours.officeCode), asc(schema.workingHours.weekday));
  const hol = await db.select().from(schema.holidays).orderBy(asc(schema.holidays.date));
  const rs = await db.select().from(schema.rsServiceFees);
  const access = await db.select().from(schema.ecustomsAccessFees);
  const pen = await db.select().from(schema.penaltyRules);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("fees")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>fee_schedules</CardTitle>
          <CardDescription>Decree №96 (№201/2022 edition). All rows need re-verification (20+ amendments since, last 06.07.2026). Edit via a new migration/seed, not ad hoc.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>mode</Th>
                <Th>min</Th>
                <Th>max</Th>
                <Th>fee</Th>
                <Th>×2 off-hours</Th>
                <Th>legal ref</Th>
                <Th>effective</Th>
              </tr>
            </thead>
            <tbody>
              {fees.map((f) => (
                <tr key={f.id}>
                  <Td>{f.mode}</Td>
                  <Td className="num">{f.valueMin}</Td>
                  <Td className="num">{f.valueMax ?? "∞"}</Td>
                  <Td className="num">{formatGel(f.feeGel)}</Td>
                  <Td>{f.doublesOffHours ? <Badge tone="warn">yes</Badge> : "no"}</Td>
                  <Td className="text-xs">
                    {f.legalRef} {f.needsReverification ? <Badge tone="warn">reverify</Badge> : null}
                  </Td>
                  <Td className="num">{fmtDate(f.effectiveFrom)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>working_hours</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <tbody>
                {wh.map((w) => (
                  <tr key={w.id}>
                    <Td>{w.officeCode ?? "default"}</Td>
                    <Td>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][w.weekday]}</Td>
                    <Td className="num">{w.opensAt ? `${w.opensAt}–${w.closesAt}` : "closed"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("holidays")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addHolidayAction} className="mb-3 flex items-end gap-2">
              <Field label="date">
                <Input name="date" type="date" required className="h-8" />
              </Field>
              <Field label="name">
                <Input name="name" required className="h-8" />
              </Field>
              <SubmitButton size="sm" variant="secondary">
                add
              </SubmitButton>
            </form>
            <Table>
              <tbody>
                {hol.map((h) => (
                  <tr key={h.id}>
                    <Td className="num">{fmtDate(h.date)}</Td>
                    <Td>
                      {h.name} {h.needsReverification ? <Badge tone="warn">verify</Badge> : null}
                    </Td>
                    <Td>
                      <form action={deleteHolidayAction.bind(null, h.id)}>
                        <SubmitButton size="sm" variant="ghost">
                          ✕
                        </SubmitButton>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>rs_service_fees · ecustoms_access_fees</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <tbody>
                {rs.map((r) => (
                  <tr key={r.id}>
                    <Td>{r.labelKa}</Td>
                    <Td className="num">{formatGel(r.feeGel)}</Td>
                    <Td className="text-xs">{r.legalRef}</Td>
                  </tr>
                ))}
                {access.map((a) => (
                  <tr key={a.id}>
                    <Td>eCustoms access {a.termMonths} months</Td>
                    <Td className="num">{formatGel(a.feeGel)}</Td>
                    <Td className="text-xs">{a.legalRef}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>penalty_rules</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <tbody>
                {pen.map((p) => (
                  <tr key={p.id}>
                    <Td>{p.rule}</Td>
                    <Td className="num">{p.percent}%</Td>
                    <Td className="num">{p.thresholdGel ?? "—"}</Td>
                    <Td className="text-xs">{p.legalRef}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
