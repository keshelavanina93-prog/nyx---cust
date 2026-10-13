/**
 * Field-by-field sheet (ველ-ველ ფურცელი): the primary fallback for manual entry into eCustoms.
 * Ordered by SAD box, Georgian labels, each with a copyable value.
 */
import type { DeclarationModel } from "../model";
import { GE_DOC_CODES } from "../sad-xml/profiles/ge";

export type SheetField = { box: string; labelKa: string; value: string; hintKa?: string; verified: boolean };
export type SheetSection = { titleKa: string; fields: SheetField[] };

const v = (x: string | number | null | undefined) => (x === null || x === undefined || x === "" ? "—" : String(x));

export function buildSheet(model: DeclarationModel): SheetSection[] {
  const d = model.declaration;
  const header: SheetField[] = [
    { box: "A", labelKa: "საბაჟო ორგანო (გეზი)", value: `${v(d.officeCode)} ${d.officeName ?? ""}`.trim(), verified: true },
    { box: "1", labelKa: "დეკლარაციის ტიპი", value: `${d.type} ${d.procedure.slice(0, 1)}`, hintKa: "IM 4 — იმპორტი თავისუფალ მიმოქცევაში [შეამოწმე]", verified: false },
    { box: "2", labelKa: "გამგზავნი / ექსპორტიორი", value: [d.exporterName, d.exporterAddress, d.exporterCountry].filter(Boolean).join(", "), verified: false },
    { box: "5", labelKa: "პოზიციების რაოდენობა", value: v(d.totalItems), verified: false },
    { box: "6", labelKa: "ადგილების რაოდენობა", value: v(d.totalPackages), verified: false },
    { box: "7", labelKa: "დეკლარანტის ნომერი (reference)", value: d.reference, verified: false },
    { box: "8", labelKa: "იმპორტიორი (მიმღები)", value: `${d.consigneeName}${d.consigneeTaxId ? " · ს/კ " + d.consigneeTaxId : ""}`, verified: false },
    { box: "14", labelKa: "დეკლარანტი", value: `${d.declarantName}${d.declarantTaxId ? " · ს/კ " + d.declarantTaxId : ""}`, hintKa: "დეკლარანტი იმპორტიორია (საბაჟო კოდექსი მ.6)", verified: false },
    { box: "15", labelKa: "გამგზავნი ქვეყანა", value: v(d.dispatchCountry), verified: false },
    { box: "16", labelKa: "წარმოშობის ქვეყანა", value: v(d.originCountry), verified: false },
    { box: "17", labelKa: "დანიშნულების ქვეყანა", value: "GE", verified: false },
    { box: "18", labelKa: "სატრანსპორტო საშუალება", value: v(d.transportIdentity), verified: false },
    { box: "20", labelKa: "მიწოდების პირობები", value: `${v(d.incoterm)} ${d.incotermPlace ?? ""}`.trim(), verified: false },
    { box: "22", labelKa: "ვალუტა და ინვოისის ჯამი", value: `${d.invoiceCurrency} ${d.invoiceTotal}`, verified: false },
    { box: "23", labelKa: "კურსი (NBG, რეგისტრაციის დღე)", value: `${model.fx.rate} (${model.fx.date}, ${model.fx.source})`, hintKa: "საბაჟო კოდექსი მ.8", verified: true },
    { box: "25", labelKa: "ტრანსპორტის სახე საზღვარზე", value: v(d.transportMode), verified: false },
    { box: "29", labelKa: "შემოსვლის საბაჟო ორგანო", value: v(d.borderOffice), verified: false },
    { box: "31/35/38", labelKa: "ბრუტო / ნეტო წონა (სულ, კგ)", value: `${v(d.grossWeightKg)} / ${v(d.netWeightKg)}`, verified: false },
    { box: "44", labelKa: "დამატებითი ინფორმაცია", value: d.preArrival ? "წინასწარი დეკლარაცია (≤45 დღე ჩამოსვლამდე)" : "ტვირთი შემოსულია", verified: true },
  ];
  const sections: SheetSection[] = [{ titleKa: "სათაური (ზოგადი ნაწილი)", fields: header }];

  for (const it of d.items) {
    sections.push({
      titleKa: `პოზიცია ${it.itemNo}`,
      fields: [
        { box: "32", labelKa: "პოზიციის ნომერი", value: String(it.itemNo), verified: false },
        { box: "33", labelKa: "სასაქონლო კოდი (HS)", value: it.hsCode, verified: true },
        { box: "31", labelKa: "საქონლის აღწერა", value: it.descriptionKa, hintKa: `ორიგინალი: ${it.descriptionRaw}`, verified: false },
        { box: "31", labelKa: "ადგილების რაოდენობა", value: v(it.packages), verified: false },
        { box: "34", labelKa: "წარმოშობის ქვეყანა", value: v(it.originCountry), verified: false },
        { box: "35", labelKa: "ბრუტო წონა (კგ)", value: v(it.grossWeightKg), verified: false },
        { box: "37", labelKa: "პროცედურა", value: `${d.procedure} 000`, hintKa: "[შეამოწმე] ეროვნული პროცედურის კოდი", verified: false },
        { box: "38", labelKa: "ნეტო წონა (კგ)", value: v(it.netWeightKg), verified: false },
        { box: "41", labelKa: "რაოდენობა / ერთეული", value: `${it.quantity} ${it.unit ?? ""}`.trim(), verified: false },
        { box: "42", labelKa: "პოზიციის ფასი (ინვოისი)", value: `${it.invoiceValue} ${it.invoiceCurrency}`, verified: false },
        { box: "44", labelKa: "დოკუმენტები", value: it.attachedDocs.map((a) => `${a.code} ${a.name}${a.reference ? " " + a.reference : ""}`).join("; ") || "—", hintKa: Object.values(GE_DOC_CODES).length ? "კოდები [შეამოწმე RS-ის კლასიფიკატორთან]" : undefined, verified: false },
        { box: "46", labelKa: "საბაჟო ღირებულება (₾)", value: it.customsValueGel, hintKa: `ინვოისი ${it.invoiceValueGel} + ფრახტი ${it.freightGel} + დაზღვევა ${it.insuranceGel} + სხვა ${it.otherGel}`, verified: true },
        { box: "47", labelKa: "ბაჟი", value: `${it.dutyRate}% → ${it.dutyGel} ₾`, verified: true },
        { box: "47", labelKa: "აქციზი", value: `${it.exciseGel} ₾`, verified: true },
        { box: "47", labelKa: "დღგ", value: `${it.vatGel} ₾`, verified: true },
      ],
    });
  }

  sections.push({
    titleKa: "ჯამები (B)",
    fields: [
      { box: "B", labelKa: "საბაჟო ღირებულება სულ (₾)", value: d.customsValueGel, verified: true },
      { box: "B", labelKa: "ბაჟი სულ", value: d.dutyTotalGel, verified: true },
      { box: "B", labelKa: "აქციზი სულ", value: d.exciseTotalGel, verified: true },
      { box: "B", labelKa: "დღგ სულ", value: d.vatTotalGel, verified: true },
      { box: "B", labelKa: `საფასური (${model.feeSchedule.mode}, ${model.feeSchedule.legalRef})`, value: d.feeGel, verified: true },
      { box: "B", labelKa: "სულ გადასახდელი (₾)", value: d.totalPayableGel, verified: true },
      { box: "—", labelKa: "ტარიფის ვერსია", value: `${model.tariffVersion.source} (${model.tariffVersion.effectiveFrom})${model.tariffVersion.isPlaceholder ? " — PLACEHOLDER" : ""}`, verified: true },
      { box: "—", labelKa: "საფასურის ცხრილი", value: `№96, ${model.feeSchedule.effectiveFrom}`, verified: true },
    ],
  });
  return sections;
}
