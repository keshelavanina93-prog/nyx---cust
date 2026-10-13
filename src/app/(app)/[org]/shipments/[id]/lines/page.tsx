import { getLocale, getTranslations } from "next-intl/server";
import { Stepper } from "@/components/stepper";
import { Alert } from "@/components/ui/primitives";
import { LinesEditor, type LineRow } from "@/components/shipment/lines-editor";
import { INCOTERMS } from "@/lib/customs/incoterms";
import { preArrivalWindowCheck } from "@/lib/customs/fees";
import { GE_OFFICES } from "@/db/seed/reference";
import { shipmentPage } from "../_lib";
import { saveLinesAction, addLineAction, deleteLineAction } from "../../actions";

export default async function LinesPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { ctx, full, base, canEdit } = await shipmentPage(params);
  const ts = await getTranslations("shipment");
  const locale = await getLocale();
  const s = full.shipment;
  const slug = ctx.org.slug;
  const sid = s.id;
  const save = saveLinesAction.bind(null, slug, sid);
  const add = addLineAction.bind(null, slug, sid);
  async function remove(formData: FormData) {
    "use server";
    const id = String(formData.get("deleteId") ?? "");
    if (id) await deleteLineAction(slug, sid, id);
  }
  const invoiceDoc = full.documents.find((d) => d.kind === "invoice");
  const win = preArrivalWindowCheck(s.expectedArrivalDate, new Date());

  const lines: LineRow[] = full.lines.map((l) => ({
    id: l.id,
    lineNo: l.lineNo,
    descriptionRaw: l.descriptionRaw,
    descriptionNormalizedKa: l.descriptionNormalizedKa,
    sku: l.sku,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
    originCountry: l.originCountry,
    netWeightKg: l.netWeightKg,
    grossWeightKg: l.grossWeightKg,
    confidence: Number(l.extractionConfidence ?? 1),
    edited: l.editedByHuman,
    bbox: l.sourceBbox ?? null,
  }));

  return (
    <div className="space-y-5">
      <Stepper base={base} status={s.status} current="lines" />
      {s.mode === "pre_arrival_self" && !win.ok ? <Alert tone="warn">{win.reason === "too_early" ? ts("preArrivalWarnTooEarly", { days: win.daysUntil ?? 0 }) : ts("preArrivalWarnArrived")}</Alert> : null}
      <LinesEditor
        save={save}
        add={add}
        remove={remove}
        lines={lines}
        doc={invoiceDoc ? { id: invoiceDoc.id, mime: invoiceDoc.mime, fileName: invoiceDoc.fileName } : null}
        readOnly={!canEdit}
        offices={GE_OFFICES.filter((o) => o.code !== "ECEZ").map((o) => ({ code: o.code, name: locale === "en" ? o.name_en : o.name_ka }))}
        incoterms={[...INCOTERMS]}
        details={{
          incoterm: s.incoterm,
          incotermPlace: s.incotermPlace,
          currency: s.currency,
          invoiceNumber: s.invoiceNumber,
          invoiceDate: s.invoiceDate,
          invoiceTotal: s.invoiceTotal,
          freightAmount: s.freightAmount,
          freightCurrency: s.freightCurrency,
          insuranceAmount: s.insuranceAmount,
          insuranceCurrency: s.insuranceCurrency,
          originCountry: s.originCountry,
          dispatchCountry: s.dispatchCountry,
          transportMode: s.transportMode,
          transportDocNo: s.transportDocNo,
          borderPost: s.borderPost,
          destinationOffice: s.destinationOffice,
          grossWeightKg: s.grossWeightKg,
          netWeightKg: s.netWeightKg,
          packages: s.packages,
          expectedArrivalDate: s.expectedArrivalDate,
          declarationRegistrationDate: s.declarationRegistrationDate,
          allocationBasis: s.allocationBasis,
          mode: s.mode,
        }}
      />
    </div>
  );
}
