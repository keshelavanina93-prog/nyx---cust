"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import Decimal from "decimal.js";
import { AlertTriangle, CheckCircle2, ChevronDown, FileSearch, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge, Card, CardContent, CardHeader, CardTitle, ConfidenceBar, Input, Select } from "@/components/ui/primitives";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Explain } from "@/components/ui/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { SourceBbox } from "@/db/schema";
import { DocViewer, type ViewerDoc } from "./doc-viewer";
import { LField } from "./lfield";

export type LineRow = {
  id: string;
  lineNo: number;
  descriptionRaw: string;
  descriptionNormalizedKa: string | null;
  sku: string | null;
  quantity: string;
  unit: string | null;
  unitPrice: string;
  lineTotal: string;
  originCountry: string | null;
  netWeightKg: string | null;
  grossWeightKg: string | null;
  confidence: number;
  edited: boolean;
  bbox: SourceBbox | null;
};

export type ShipmentDetails = {
  incoterm: string | null;
  incotermPlace: string | null;
  currency: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceTotal: string | null;
  freightAmount: string | null;
  freightCurrency: string | null;
  insuranceAmount: string | null;
  insuranceCurrency: string | null;
  originCountry: string | null;
  dispatchCountry: string | null;
  transportMode: string | null;
  transportDocNo: string | null;
  borderPost: string | null;
  destinationOffice: string | null;
  grossWeightKg: string | null;
  netWeightKg: string | null;
  packages: number | null;
  expectedArrivalDate: string | null;
  declarationRegistrationDate: string | null;
  allocationBasis: string;
  mode: string;
};

type Props = {
  save: (formData: FormData) => Promise<void>;
  add: () => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
  lines: LineRow[];
  details: ShipmentDetails;
  doc: ViewerDoc;
  readOnly: boolean;
  offices: { code: string; name: string }[];
  incoterms: string[];
  lowConfidence?: number;
};

/** Remounts when the server data changes (add/delete/save) so local live-state never drifts from the database. */
export function LinesEditor(props: Props) {
  const signature = props.lines.map((l) => `${l.id}:${l.lineTotal}`).join("|") + `#${props.details.invoiceTotal ?? ""}`;
  return <Editor key={signature} {...props} />;
}

function parseDec(s: string | null | undefined): Decimal | null {
  const v = (s ?? "").trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(v)) return null;
  return new Decimal(v);
}

function Editor({ save, add, remove, lines, details: d, doc, readOnly: ro, offices, incoterms, lowConfidence = 0.75 }: Props) {
  const t = useTranslations("lines");
  const ts = useTranslations("shipment");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<Set<string>>(() => new Set());
  const [showDoc, setShowDoc] = React.useState(false);
  const [totals, setTotals] = React.useState<Record<string, string>>(() => Object.fromEntries(lines.map((l) => [l.id, l.lineTotal])));
  const [invoiceTotal, setInvoiceTotal] = React.useState(d.invoiceTotal ?? "");

  const sum = lines.reduce((a, l) => a.plus(parseDec(totals[l.id]) ?? 0), new Decimal(0));
  const hasInvalid = lines.some((l) => parseDec(totals[l.id]) === null);
  const inv = parseDec(invoiceTotal);
  const diff = inv ? sum.minus(inv) : null;
  const mismatch = diff ? diff.abs().gt("0.01") : false;
  const active = lines.find((l) => l.id === activeId) ?? null;

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={save} className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
      {/* default submit button: pressing Enter in a field must save, never trigger a row's delete button */}
      <button type="submit" name="intent" value="save" tabIndex={-1} aria-hidden className="sr-only" />
      {/* ---------------------------- original document ---------------------------- */}
      <div className="min-w-0 lg:sticky lg:top-20">
        <Button type="button" variant="outline" size="sm" className="mb-2 lg:hidden" aria-expanded={showDoc} onClick={() => setShowDoc((v) => !v)}>
          <FileSearch aria-hidden />
          {t("original")}
        </Button>
        <DocViewer doc={doc} bbox={active?.bbox ?? null} activeLabel={active ? t("focusedLine", { n: active.lineNo }) : null} className={cn(!showDoc && "max-lg:hidden")} />
      </div>

      <div className="min-w-0 space-y-5">
        {/* ------------------------------- details ------------------------------- */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{ts("details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="invoice">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="invoice" className="flex-1 sm:flex-none">
                  {t("tabInvoice")}
                  {mismatch ? <span className="size-2 rounded-full bg-danger" aria-hidden /> : null}
                </TabsTrigger>
                <TabsTrigger value="transport" className="flex-1 sm:flex-none">
                  {t("tabTransport")}
                </TabsTrigger>
                <TabsTrigger value="value" className="flex-1 sm:flex-none">
                  {t("tabValue")}
                </TabsTrigger>
              </TabsList>

              {/* forceMount: hidden tabs must stay in the DOM so every field is submitted with the form */}
              <TabsContent value="invoice" forceMount className="data-[state=inactive]:hidden">
                <div className="grid gap-3 sm:grid-cols-2">
                  <LField label={ts("invoiceNumber")}>
                    <Input name="invoiceNumber" defaultValue={d.invoiceNumber ?? ""} readOnly={ro} />
                  </LField>
                  <LField label={ts("invoiceDate")}>
                    <Input name="invoiceDate" type="date" defaultValue={d.invoiceDate ?? ""} readOnly={ro} />
                  </LField>
                  <LField label={ts("invoiceTotal")}>
                    <Input name="invoiceTotal" value={invoiceTotal} onChange={(e) => setInvoiceTotal(e.target.value)} inputMode="decimal" readOnly={ro} className="num" />
                  </LField>
                  <LField label={ts("currency")}>
                    <Input name="currency" defaultValue={d.currency} maxLength={3} readOnly={ro} className="uppercase" />
                  </LField>
                  <LField label={<Explain term="incoterm">{ts("incoterm")}</Explain>}>
                    <Select name="incoterm" defaultValue={d.incoterm ?? ""} disabled={ro}>
                      <option value="">—</option>
                      {incoterms.map((i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </Select>
                  </LField>
                  <LField label={ts("incotermPlace")}>
                    <Input name="incotermPlace" defaultValue={d.incotermPlace ?? ""} readOnly={ro} />
                  </LField>
                  <LField label={ts("originCountry")}>
                    <Input name="originCountry" defaultValue={d.originCountry ?? ""} maxLength={2} readOnly={ro} className="uppercase" />
                  </LField>
                  <LField label={ts("dispatchCountry")}>
                    <Input name="dispatchCountry" defaultValue={d.dispatchCountry ?? ""} maxLength={2} readOnly={ro} className="uppercase" />
                  </LField>
                </div>
              </TabsContent>

              <TabsContent value="transport" forceMount className="data-[state=inactive]:hidden">
                <div className="grid gap-3 sm:grid-cols-2">
                  <LField label={ts("transportMode")}>
                    <Select name="transportMode" defaultValue={d.transportMode ?? ""} disabled={ro}>
                      <option value="">—</option>
                      <option value="1">1 · {ts("transport1")}</option>
                      <option value="2">2 · {ts("transport2")}</option>
                      <option value="3">3 · {ts("transport3")}</option>
                      <option value="4">4 · {ts("transport4")}</option>
                      <option value="5">5 · {ts("transport5")}</option>
                    </Select>
                  </LField>
                  <LField label={ts("transportDocNo")}>
                    <Input name="transportDocNo" defaultValue={d.transportDocNo ?? ""} readOnly={ro} />
                  </LField>
                  <LField label={ts("borderPost")}>
                    <Input name="borderPost" defaultValue={d.borderPost ?? ""} readOnly={ro} />
                  </LField>
                  <LField label={<Explain term="cez">{ts("destinationOffice")}</Explain>}>
                    <Select name="destinationOffice" defaultValue={d.destinationOffice ?? ""} disabled={ro}>
                      <option value="">—</option>
                      {offices.map((o) => (
                        <option key={o.code} value={o.code}>
                          {o.code} · {o.name}
                        </option>
                      ))}
                    </Select>
                  </LField>
                  <LField label={ts("grossWeight")}>
                    <Input name="grossWeightKg" defaultValue={d.grossWeightKg ?? ""} inputMode="decimal" readOnly={ro} className="num" />
                  </LField>
                  <LField label={ts("netWeight")}>
                    <Input name="netWeightKg" defaultValue={d.netWeightKg ?? ""} inputMode="decimal" readOnly={ro} className="num" />
                  </LField>
                  <LField label={ts("packages")}>
                    <Input name="packages" type="number" min={0} defaultValue={d.packages ?? ""} readOnly={ro} className="num" />
                  </LField>
                  <LField label={ts("expectedArrival")}>
                    <Input name="expectedArrivalDate" type="date" defaultValue={d.expectedArrivalDate ?? ""} readOnly={ro} />
                  </LField>
                </div>
              </TabsContent>

              <TabsContent value="value" forceMount className="data-[state=inactive]:hidden">
                <div className="grid gap-3 sm:grid-cols-2">
                  <LField label={ts("freight")} htmlFor="freightAmount">
                    <div className="flex gap-2">
                      <Input id="freightAmount" name="freightAmount" defaultValue={d.freightAmount ?? ""} inputMode="decimal" readOnly={ro} className="num" />
                      <Input name="freightCurrency" aria-label={`${ts("freight")} · ${ts("currency")}`} defaultValue={d.freightCurrency ?? d.currency} maxLength={3} className="w-20 uppercase" readOnly={ro} />
                    </div>
                  </LField>
                  <LField label={ts("insurance")} htmlFor="insuranceAmount">
                    <div className="flex gap-2">
                      <Input id="insuranceAmount" name="insuranceAmount" defaultValue={d.insuranceAmount ?? ""} inputMode="decimal" readOnly={ro} className="num" />
                      <Input name="insuranceCurrency" aria-label={`${ts("insurance")} · ${ts("currency")}`} defaultValue={d.insuranceCurrency ?? d.currency} maxLength={3} className="w-20 uppercase" readOnly={ro} />
                    </div>
                  </LField>
                  <LField label={ts("allocationBasis")}>
                    <Select name="allocationBasis" defaultValue={d.allocationBasis} disabled={ro}>
                      <option value="value">{ts("byValue")}</option>
                      <option value="weight">{ts("byWeight")}</option>
                    </Select>
                  </LField>
                  <LField label={<Explain term="preArrival">{ts("mode")}</Explain>}>
                    <Select name="mode" defaultValue={d.mode} disabled={ro}>
                      <option value="pre_arrival_self">{ts("modePre")}</option>
                      <option value="post_arrival_self">{ts("modePost")}</option>
                    </Select>
                  </LField>
                  <LField label={ts("registrationDate")} hint={ts("registrationDateHint")} className="sm:col-span-2">
                    <Input name="declarationRegistrationDate" type="date" defaultValue={d.declarationRegistrationDate ?? ""} readOnly={ro} className="sm:max-w-56" />
                  </LField>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* -------------------------------- lines -------------------------------- */}
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>{t("title")}</CardTitle>
            <Badge className="num">{t("lineCount", { n: lines.length })}</Badge>
          </CardHeader>
          <CardContent>
            <div className="scrollbar-thin -mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="rounded-l-lg bg-muted px-2 py-2.5">{t("lineNo")}</th>
                    <th className="bg-muted px-2 py-2.5">{t("description")}</th>
                    <th className="bg-muted px-2 py-2.5">{t("qty")}</th>
                    <th className="bg-muted px-2 py-2.5">{t("unit")}</th>
                    <th className="bg-muted px-2 py-2.5">{t("unitPrice")}</th>
                    <th className="bg-muted px-2 py-2.5">{t("lineTotal")}</th>
                    <th className="bg-muted px-2 py-2.5">{t("confidence")}</th>
                    <th className="rounded-r-lg bg-muted px-2 py-2.5">
                      <span className="sr-only">{t("rowActions")}</span>
                    </th>
                  </tr>
                </thead>
                {lines.map((l) => {
                  const n = (k: string) => `${k}:${l.id}`;
                  const low = l.confidence < lowConfidence;
                  const isOpen = open.has(l.id);
                  const isActive = l.id === activeId;
                  const detailId = `line-more-${l.id}`;
                  return (
                    <tbody
                      key={l.id}
                      data-testid={`line-${l.lineNo}`}
                      onFocusCapture={() => setActiveId(l.id)}
                      onMouseEnter={() => setActiveId((cur) => (cur === l.id ? cur : l.id))}
                      className={cn("transition-colors", low ? "bg-warning/10 hover:bg-warning/15" : "hover:bg-accent/60", isActive && "bg-accent/80 hover:bg-accent/80")}
                    >
                      <tr>
                        <td className="num border-b border-border/70 px-2 py-2 align-top font-medium text-muted-foreground">
                          <div className="flex h-8 items-center gap-1">
                            {l.lineNo}
                            <input type="hidden" name="lineId" value={l.id} />
                            {low ? <AlertTriangle className="size-3.5 text-warning" role="img" aria-label={t("lowConfidence")} /> : null}
                          </div>
                        </td>
                        <td className="min-w-52 border-b border-border/70 px-2 py-2 align-top">
                          <Input name={n("descriptionRaw")} aria-label={`${t("description")} #${l.lineNo}`} defaultValue={l.descriptionRaw} readOnly={ro} className="h-8" />
                        </td>
                        <td className="border-b border-border/70 px-2 py-2 align-top">
                          <Input name={n("quantity")} aria-label={`${t("qty")} #${l.lineNo}`} defaultValue={l.quantity} readOnly={ro} className="num h-8 w-20" inputMode="decimal" />
                        </td>
                        <td className="border-b border-border/70 px-2 py-2 align-top">
                          <Input name={n("unit")} aria-label={`${t("unit")} #${l.lineNo}`} defaultValue={l.unit ?? ""} readOnly={ro} className="h-8 w-16" />
                        </td>
                        <td className="border-b border-border/70 px-2 py-2 align-top">
                          <Input name={n("unitPrice")} aria-label={`${t("unitPrice")} #${l.lineNo}`} defaultValue={l.unitPrice} readOnly={ro} className="num h-8 w-24" inputMode="decimal" />
                        </td>
                        <td className="border-b border-border/70 px-2 py-2 align-top">
                          <Input
                            name={n("lineTotal")}
                            aria-label={`${t("lineTotal")} #${l.lineNo}`}
                            value={totals[l.id] ?? ""}
                            onChange={(e) => setTotals((prev) => ({ ...prev, [l.id]: e.target.value }))}
                            readOnly={ro}
                            aria-invalid={parseDec(totals[l.id]) === null || undefined}
                            className="num h-8 w-28"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="border-b border-border/70 px-2 py-2 align-top">
                          <div className="flex h-8 items-center">
                            <ConfidenceBar value={l.confidence} yellow={lowConfidence} className="[&>div:first-child]:w-16" />
                          </div>
                          {l.edited ? <Badge className="mt-1">{t("edited")}</Badge> : null}
                        </td>
                        <td className="border-b border-border/70 px-2 py-2 align-top">
                          <div className="flex h-8 items-center justify-end gap-0.5">
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              aria-controls={detailId}
                              aria-label={t("moreFields")}
                              onClick={() => toggle(l.id)}
                              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
                            >
                              <ChevronDown className={cn("size-4 transition-transform duration-200", isOpen && "rotate-180")} aria-hidden />
                            </button>
                            {!ro ? <DeleteButton id={l.id} label={`${t("deleteLine")} #${l.lineNo}`} remove={remove} /> : null}
                          </div>
                        </td>
                      </tr>
                      {/* secondary fields stay mounted (hidden) so the save action still receives them */}
                      <tr id={detailId} hidden={!isOpen}>
                        <td colSpan={8} className="border-b border-border/70 px-2 pb-3 pt-0">
                          <div className="grid gap-3 rounded-lg bg-card/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
                            <LField label={t("descriptionKa")} className="sm:col-span-2 lg:col-span-4">
                              <Input name={n("descriptionNormalizedKa")} defaultValue={l.descriptionNormalizedKa ?? ""} readOnly={ro} className="h-9" />
                            </LField>
                            <LField label={t("sku")}>
                              <Input name={n("sku")} defaultValue={l.sku ?? ""} readOnly={ro} className="h-9" />
                            </LField>
                            <LField label={t("origin")}>
                              <Input name={n("originCountry")} defaultValue={l.originCountry ?? ""} readOnly={ro} className="h-9 uppercase" maxLength={2} />
                            </LField>
                            <LField label={t("netKg")}>
                              <Input name={n("netWeightKg")} defaultValue={l.netWeightKg ?? ""} readOnly={ro} className="num h-9" inputMode="decimal" />
                            </LField>
                            <LField label={t("grossKg")}>
                              <Input name={n("grossWeightKg")} defaultValue={l.grossWeightKg ?? ""} readOnly={ro} className="num h-9" inputMode="decimal" />
                            </LField>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  );
                })}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------- pinned totals / actions ------------------------- */}
      <div className="sticky bottom-20 z-20 lg:bottom-4 lg:col-span-2">
        <div className={cn("glass shadow-lift flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl p-3 sm:px-4", mismatch && "border-danger/50")}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", mismatch ? "bg-danger/15 text-danger" : inv ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
              {mismatch ? <AlertTriangle className="size-5" aria-hidden /> : <CheckCircle2 className="size-5" aria-hidden />}
            </div>
            <div className="min-w-0">
              <div className="num flex flex-wrap items-baseline gap-x-3 text-sm">
                <span>
                  <span className="text-xs text-muted-foreground">{t("sumLines")} </span>
                  <strong data-testid="sum-lines">{formatAmount(sum, d.currency)}</strong>
                </span>
                <span>
                  <span className="text-xs text-muted-foreground">{ts("invoiceTotal")} </span>
                  <strong>{inv ? formatAmount(inv, d.currency) : "—"}</strong>
                </span>
                {diff && mismatch ? (
                  <span className="font-semibold text-danger">
                    {t("difference")} {diff.isPositive() ? "+" : "−"}
                    {formatAmount(diff.abs(), d.currency)}
                  </span>
                ) : null}
              </div>
              <p role="status" className={cn("text-xs", mismatch ? "font-medium text-danger" : inv ? "text-success" : "text-muted-foreground")}>
                {mismatch ? t("totalsMismatch", { sum: sum.toFixed(2), total: inv!.toFixed(2) }) : inv ? t("totalsOk") : t("noInvoiceTotal")}
                {hasInvalid ? ` · ${t("invalidNumber")}` : ""}
              </p>
            </div>
          </div>
          {!ro ? (
            <div className="flex flex-wrap items-center gap-2">
              <BarButton name="intent" value="add" variant="outline" formAction={add} formNoValidate>
                <Plus aria-hidden />
                {t("addLine")}
              </BarButton>
              <BarButton name="intent" value="save" variant="secondary">
                {t("saveLines")}
              </BarButton>
              <BarButton name="next" value="hs" data-testid="to-hs">
                {t("toHs")}
              </BarButton>
            </div>
          ) : null}
        </div>
      </div>
    </form>
  );
}

/** Submit button that only shows its spinner when *it* triggered the pending submission. */
function BarButton({ name, value, children, ...props }: ButtonProps & { name: string; value: string }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get(name) === value;
  return (
    <Button type="submit" name={name} value={value} {...props} loading={mine} disabled={pending && !mine}>
      {children}
    </Button>
  );
}

function DeleteButton({ id, label, remove }: { id: string; label: string; remove: (formData: FormData) => Promise<void> }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="deleteId"
      value={id}
      formAction={remove}
      formNoValidate
      disabled={pending}
      aria-label={label}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-danger/35 disabled:opacity-50"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}
