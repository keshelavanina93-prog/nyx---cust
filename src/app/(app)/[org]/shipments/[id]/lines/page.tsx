import { getTranslations } from "next-intl/server";
import Decimal from "decimal.js";
import { Stepper } from "@/components/stepper";
import { Card, CardContent, CardHeader, CardTitle, Field, Input, Select, Alert, Badge, Table, Th, Td, ConfidenceBar } from "@/components/ui/primitives";
import { SubmitButton, Explain } from "@/components/ui/client";
import { Button } from "@/components/ui/button";
import { INCOTERMS } from "@/lib/customs/incoterms";
import { preArrivalWindowCheck } from "@/lib/customs/fees";
import { GE_OFFICES } from "@/db/seed/reference";
import { shipmentPage } from "../_lib";
import { saveLinesAction, addLineAction, deleteLineAction } from "../../actions";

export default async function LinesPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const t = await getTranslations("lines");
  const ts = await getTranslations("shipment");
  const tc = await getTranslations("common");
  const s = full.shipment;
  const save = saveLinesAction.bind(null, ctx.org.slug, s.id);
  const add = addLineAction.bind(null, ctx.org.slug, s.id);
  const sum = full.lines.reduce((a, l) => a.plus(l.lineTotal), new Decimal(0));
  const mismatch = s.invoiceTotal ? sum.minus(s.invoiceTotal).abs().gt("0.01") : false;
  const invoiceDoc = full.documents.find((d) => d.kind === "invoice");
  const win = preArrivalWindowCheck(s.expectedArrivalDate, new Date());
  const ro = !canEdit;

  return (
    <div className="space-y-4">
      <Stepper base={base} status={s.status} current="lines" />
      {s.mode === "pre_arrival_self" && !win.ok ? <Alert tone="warn">{win.reason === "too_early" ? ts("preArrivalWarnTooEarly", { days: win.daysUntil ?? 0 }) : ts("preArrivalWarnArrived")}</Alert> : null}
      <form action={save} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Card className="lg:sticky lg:top-4 lg:self-start">
            <CardHeader>
              <CardTitle>{t("original")}</CardTitle>
            </CardHeader>
            <CardContent>
              {invoiceDoc ? (
                invoiceDoc.mime.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${invoiceDoc.id}`} alt={invoiceDoc.fileName} className="max-h-[70vh] w-full rounded border object-contain" />
                ) : invoiceDoc.mime === "application/pdf" ? (
                  <iframe src={`/api/files/${invoiceDoc.id}`} title={invoiceDoc.fileName} className="h-[70vh] w-full rounded border" />
                ) : (
                  <p className="text-sm text-slate-500">{t("noPreview")}</p>
                )
              ) : (
                <p className="text-sm text-slate-500">{t("noPreview")}</p>
              )}
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{ts("details")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Field label={<Explain term="incoterm">{ts("incoterm")}</Explain>}>
                  <Select name="incoterm" defaultValue={s.incoterm ?? ""} disabled={ro}>
                    <option value="">—</option>
                    {INCOTERMS.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={ts("incotermPlace")}>
                  <Input name="incotermPlace" defaultValue={s.incotermPlace ?? ""} readOnly={ro} />
                </Field>
                <Field label={ts("currency")}>
                  <Input name="currency" defaultValue={s.currency} maxLength={3} readOnly={ro} />
                </Field>
                <Field label={ts("invoiceTotal")}>
                  <Input name="invoiceTotal" defaultValue={s.invoiceTotal ?? ""} inputMode="decimal" readOnly={ro} />
                </Field>
                <Field label={ts("invoiceNumber")}>
                  <Input name="invoiceNumber" defaultValue={s.invoiceNumber ?? ""} readOnly={ro} />
                </Field>
                <Field label={ts("invoiceDate")}>
                  <Input name="invoiceDate" type="date" defaultValue={s.invoiceDate ?? ""} readOnly={ro} />
                </Field>
                <Field label={ts("freight")}>
                  <div className="flex gap-2">
                    <Input name="freightAmount" defaultValue={s.freightAmount ?? ""} inputMode="decimal" readOnly={ro} />
                    <Input name="freightCurrency" defaultValue={s.freightCurrency ?? s.currency} maxLength={3} className="w-20" readOnly={ro} />
                  </div>
                </Field>
                <Field label={ts("insurance")}>
                  <div className="flex gap-2">
                    <Input name="insuranceAmount" defaultValue={s.insuranceAmount ?? ""} inputMode="decimal" readOnly={ro} />
                    <Input name="insuranceCurrency" defaultValue={s.insuranceCurrency ?? s.currency} maxLength={3} className="w-20" readOnly={ro} />
                  </div>
                </Field>
                <Field label={ts("originCountry")}>
                  <Input name="originCountry" defaultValue={s.originCountry ?? ""} maxLength={2} readOnly={ro} />
                </Field>
                <Field label={ts("dispatchCountry")}>
                  <Input name="dispatchCountry" defaultValue={s.dispatchCountry ?? ""} maxLength={2} readOnly={ro} />
                </Field>
                <Field label={ts("transportMode")}>
                  <Select name="transportMode" defaultValue={s.transportMode ?? ""} disabled={ro}>
                    <option value="">—</option>
                    <option value="1">1 · საზღვაო</option>
                    <option value="2">2 · სარკინიგზო</option>
                    <option value="3">3 · საავტომობილო</option>
                    <option value="4">4 · საჰაერო</option>
                    <option value="5">5 · საფოსტო</option>
                  </Select>
                </Field>
                <Field label={ts("transportDocNo")}>
                  <Input name="transportDocNo" defaultValue={s.transportDocNo ?? ""} readOnly={ro} />
                </Field>
                <Field label={ts("borderPost")}>
                  <Input name="borderPost" defaultValue={s.borderPost ?? ""} readOnly={ro} />
                </Field>
                <Field label={<Explain term="cez">{ts("destinationOffice")}</Explain>}>
                  <Select name="destinationOffice" defaultValue={s.destinationOffice ?? ""} disabled={ro}>
                    <option value="">—</option>
                    {GE_OFFICES.filter((o) => o.code !== "ECEZ").map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.code} · {o.name_ka}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={ts("grossWeight")}>
                  <Input name="grossWeightKg" defaultValue={s.grossWeightKg ?? ""} inputMode="decimal" readOnly={ro} />
                </Field>
                <Field label={ts("netWeight")}>
                  <Input name="netWeightKg" defaultValue={s.netWeightKg ?? ""} inputMode="decimal" readOnly={ro} />
                </Field>
                <Field label={ts("packages")}>
                  <Input name="packages" type="number" defaultValue={s.packages ?? ""} readOnly={ro} />
                </Field>
                <Field label={ts("expectedArrival")}>
                  <Input name="expectedArrivalDate" type="date" defaultValue={s.expectedArrivalDate ?? ""} readOnly={ro} />
                </Field>
                <Field label={ts("registrationDate")} hint={ts("registrationDateHint")} className="sm:col-span-2">
                  <Input name="declarationRegistrationDate" type="date" defaultValue={s.declarationRegistrationDate ?? ""} readOnly={ro} />
                </Field>
                <Field label={ts("allocationBasis")}>
                  <Select name="allocationBasis" defaultValue={s.allocationBasis} disabled={ro}>
                    <option value="value">{ts("byValue")}</option>
                    <option value="weight">{ts("byWeight")}</option>
                  </Select>
                </Field>
                <Field label={<Explain term="preArrival">{ts("mode")}</Explain>}>
                  <Select name="mode" defaultValue={s.mode} disabled={ro}>
                    <option value="pre_arrival_self">წინასწარი, თვითონ (82)</option>
                    <option value="post_arrival_self">შემოტანის შემდეგ, თვითონ (54¹)</option>
                  </Select>
                </Field>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("title")}</CardTitle>
            {mismatch ? <Badge tone="danger">{t("totalsMismatch", { sum: sum.toFixed(2), total: s.invoiceTotal ?? "—" })}</Badge> : s.invoiceTotal ? <Badge tone="ok">{t("totalsOk")}</Badge> : null}
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>{t("lineNo")}</Th>
                  <Th className="min-w-56">{t("description")}</Th>
                  <Th className="min-w-48">{t("descriptionKa")}</Th>
                  <Th>{t("sku")}</Th>
                  <Th>{t("qty")}</Th>
                  <Th>{t("unit")}</Th>
                  <Th>{t("unitPrice")}</Th>
                  <Th>{t("lineTotal")}</Th>
                  <Th>{t("origin")}</Th>
                  <Th>{t("netKg")}</Th>
                  <Th>{t("grossKg")}</Th>
                  <Th>{t("confidence")}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {full.lines.map((l) => {
                  const n = (k: string) => `${k}:${l.id}`;
                  const conf = Number(l.extractionConfidence ?? 1);
                  return (
                    <tr key={l.id} className={conf < 0.75 ? "bg-amber-50" : undefined}>
                      <Td className="num">
                        {l.lineNo}
                        <input type="hidden" name="lineId" value={l.id} />
                      </Td>
                      <Td>
                        <Input name={n("descriptionRaw")} defaultValue={l.descriptionRaw} readOnly={ro} className="h-8" />
                      </Td>
                      <Td>
                        <Input name={n("descriptionNormalizedKa")} defaultValue={l.descriptionNormalizedKa ?? ""} readOnly={ro} className="h-8" />
                      </Td>
                      <Td>
                        <Input name={n("sku")} defaultValue={l.sku ?? ""} readOnly={ro} className="h-8 w-24" />
                      </Td>
                      <Td>
                        <Input name={n("quantity")} defaultValue={l.quantity} readOnly={ro} className="h-8 w-20 num" inputMode="decimal" />
                      </Td>
                      <Td>
                        <Input name={n("unit")} defaultValue={l.unit ?? ""} readOnly={ro} className="h-8 w-16" />
                      </Td>
                      <Td>
                        <Input name={n("unitPrice")} defaultValue={l.unitPrice} readOnly={ro} className="h-8 w-24 num" inputMode="decimal" />
                      </Td>
                      <Td>
                        <Input name={n("lineTotal")} defaultValue={l.lineTotal} readOnly={ro} className="h-8 w-24 num" inputMode="decimal" />
                      </Td>
                      <Td>
                        <Input name={n("originCountry")} defaultValue={l.originCountry ?? ""} readOnly={ro} className="h-8 w-14" maxLength={2} />
                      </Td>
                      <Td>
                        <Input name={n("netWeightKg")} defaultValue={l.netWeightKg ?? ""} readOnly={ro} className="h-8 w-20 num" inputMode="decimal" />
                      </Td>
                      <Td>
                        <Input name={n("grossWeightKg")} defaultValue={l.grossWeightKg ?? ""} readOnly={ro} className="h-8 w-20 num" inputMode="decimal" />
                      </Td>
                      <Td>
                        <ConfidenceBar value={conf} />
                        {l.editedByHuman ? <Badge className="mt-1">{t("edited")}</Badge> : null}
                      </Td>
                      <Td>
                        {canEdit ? (
                          <Button variant="ghost" size="sm" formAction={deleteLineAction.bind(null, ctx.org.slug, s.id, l.id)} formNoValidate>
                            {t("deleteLine")}
                          </Button>
                        ) : null}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {canEdit ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" formAction={add} formNoValidate>
                  {t("addLine")}
                </Button>
                <SubmitButton variant="secondary">{t("saveLines")}</SubmitButton>
                <SubmitButton name="next" value="hs" data-testid="to-hs">
                  {t("toHs")}
                </SubmitButton>
                <span className="self-center text-xs text-slate-500">{tc("status")}: ყოველი ცვლილება აუდიტის ჟურნალში იწერება.</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
