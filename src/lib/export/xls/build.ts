import ExcelJS from "exceljs";
import type { DeclarationModel } from "../model";

/** XLS export: lines + calculation + versions (brief §5.7). */
export async function buildXlsx(model: DeclarationModel): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Customs Copilot GE";
  const d = model.declaration;

  const lines = wb.addWorksheet("ხაზები");
  lines.columns = [
    { header: "№", key: "no", width: 5 },
    { header: "HS კოდი", key: "hs", width: 14 },
    { header: "აღწერა (ka)", key: "ka", width: 40 },
    { header: "აღწერა (ორიგინალი)", key: "raw", width: 40 },
    { header: "წარმოშობა", key: "origin", width: 10 },
    { header: "რაოდენობა", key: "qty", width: 12 },
    { header: "ერთეული", key: "unit", width: 8 },
    { header: "ნეტო კგ", key: "net", width: 10 },
    { header: "ბრუტო კგ", key: "gross", width: 10 },
    { header: `ფასი (${d.invoiceCurrency})`, key: "inv", width: 14 },
    { header: "ფასი ₾", key: "invGel", width: 14 },
    { header: "ფრახტი ₾", key: "fr", width: 12 },
    { header: "დაზღვევა ₾", key: "ins", width: 12 },
    { header: "საბაჟო ღირ. ₾", key: "cv", width: 16 },
    { header: "ბაჟი %", key: "rate", width: 8 },
    { header: "ბაჟი ₾", key: "duty", width: 12 },
    { header: "აქციზი ₾", key: "exc", width: 12 },
    { header: "დღგ ₾", key: "vat", width: 12 },
    { header: "სულ ₾", key: "tot", width: 14 },
  ];
  for (const it of d.items) {
    lines.addRow({ no: it.itemNo, hs: it.hsCode, ka: it.descriptionKa, raw: it.descriptionRaw, origin: it.originCountry, qty: Number(it.quantity), unit: it.unit, net: it.netWeightKg ? Number(it.netWeightKg) : null, gross: it.grossWeightKg ? Number(it.grossWeightKg) : null, inv: Number(it.invoiceValue), invGel: Number(it.invoiceValueGel), fr: Number(it.freightGel), ins: Number(it.insuranceGel), cv: Number(it.customsValueGel), rate: Number(it.dutyRate), duty: Number(it.dutyGel), exc: Number(it.exciseGel), vat: Number(it.vatGel), tot: Number(it.totalGel) });
  }
  lines.getRow(1).font = { bold: true };

  const calc = wb.addWorksheet("გამოთვლა");
  const rows: [string, string | number][] = [
    ["დეკლარაცია", d.reference],
    ["რეგისტრაციის თარიღი (კურსის დღე)", d.registrationDate],
    ["რეჟიმი", d.preArrival ? "წინასწარი" : "შემოტანის შემდეგ"],
    ["Incoterm", `${d.incoterm ?? ""} ${d.incotermPlace ?? ""}`],
    ["ვალუტა / კურსი", `${model.fx.currency} ${model.fx.rate} (${model.fx.date}, ${model.fx.source})`],
    ["ინვოისი სულ", `${d.invoiceTotal} ${d.invoiceCurrency} = ${d.invoiceTotalGel} ₾`],
    ["ფრახტი ₾", d.freightGel],
    ["დაზღვევა ₾", d.insuranceGel],
    ["სხვა ხარჯი ₾", d.otherGel],
    ["საბაჟო ღირებულება ₾", d.customsValueGel],
    ["ბაჟი ₾", d.dutyTotalGel],
    ["აქციზი ₾", d.exciseTotalGel],
    ["დღგ ₾", d.vatTotalGel],
    [`საფასური ₾ (${model.feeSchedule.mode})`, d.feeGel],
    ["სულ გადასახდელი ₾", d.totalPayableGel],
  ];
  rows.forEach(([k, v]) => calc.addRow([k, v]));
  calc.getColumn(1).width = 40;
  calc.getColumn(2).width = 40;

  const ver = wb.addWorksheet("ვერსიები");
  [
    ["ტარიფის ვერსია", `${model.tariffVersion.source} / ${model.tariffVersion.effectiveFrom}${model.tariffVersion.isPlaceholder ? " / PLACEHOLDER" : ""}`],
    ["საფასურის ცხრილი", `${model.feeSchedule.legalRef} / ${model.feeSchedule.effectiveFrom}`],
    ["კურსი", `${model.fx.currency} ${model.fx.rate} / ${model.fx.date} / ${model.fx.source}`],
    ["XML პროფილი", `${model.profileVersion}${model.experimental ? " (ექსპერიმენტული)" : ""}`],
    ["გენერირებულია", model.generatedAt],
  ].forEach((r) => ver.addRow(r));
  ver.getColumn(1).width = 30;
  ver.getColumn(2).width = 60;

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}
