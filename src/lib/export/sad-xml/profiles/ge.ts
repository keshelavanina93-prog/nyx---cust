/**
 * Georgian SAD XML profile — EXPERIMENTAL.
 * Base: UNCTAD ASYCUDA World SAD XML structure (Import/Export XML File on the SAD) [VERIFIED to exist].
 * Georgian national fields / XSD and whether the import button is enabled in eCustoms are [UNVERIFIED].
 * This profile is a versioned mapping of SAD boxes → ASYCUDA element paths. It must be validated
 * against a real XML exported from the importer's own eCustoms (brief §7) before `validated = true`.
 */
export const GE_PROFILE_VERSION = "ge-experimental-0.1.0";

export type BoxMapping = {
  box: string; // SAD box number, e.g. "33"
  labelKa: string;
  labelEn: string;
  path: string; // XPath-like in ASYCUDA XML (documentation only; builder uses explicit code)
  level: "header" | "item";
  verified: boolean; // mapping verified against a Georgian sample?
};

export const GE_BOX_MAPPINGS: BoxMapping[] = [
  { box: "1", labelKa: "დეკლარაციის ტიპი", labelEn: "Declaration type", path: "ASYCUDA/Identification/Type/Type_of_declaration", level: "header", verified: false },
  { box: "1b", labelKa: "პროცედურის ზოგადი კოდი", labelEn: "General procedure code", path: "ASYCUDA/Identification/Type/Declaration_gen_procedure_code", level: "header", verified: false },
  { box: "2", labelKa: "ექსპორტიორი / გამგზავნი", labelEn: "Exporter / consignor", path: "ASYCUDA/Traders/Exporter/Exporter_name", level: "header", verified: false },
  { box: "3", labelKa: "ფორმები", labelEn: "Forms", path: "ASYCUDA/Property/Forms", level: "header", verified: false },
  { box: "5", labelKa: "საქონლის პოზიციების რაოდენობა", labelEn: "Items", path: "ASYCUDA/Property/Nbers/Total_number_of_items", level: "header", verified: false },
  { box: "6", labelKa: "ადგილების რაოდენობა", labelEn: "Total packages", path: "ASYCUDA/Property/Nbers/Total_number_of_packages", level: "header", verified: false },
  { box: "7", labelKa: "დეკლარანტის ნომერი (reference)", labelEn: "Reference number", path: "ASYCUDA/Declarant/Reference/Number", level: "header", verified: false },
  { box: "8", labelKa: "იმპორტიორი / მიმღები", labelEn: "Consignee", path: "ASYCUDA/Traders/Consignee/Consignee_name", level: "header", verified: false },
  { box: "8a", labelKa: "იმპორტიორის ს/კ", labelEn: "Consignee code (tax id)", path: "ASYCUDA/Traders/Consignee/Consignee_code", level: "header", verified: false },
  { box: "11", labelKa: "სავაჭრო ქვეყანა", labelEn: "Trading country", path: "ASYCUDA/General_information/Country/Trading_country", level: "header", verified: false },
  { box: "14", labelKa: "დეკლარანტი", labelEn: "Declarant", path: "ASYCUDA/Declarant/Declarant_name", level: "header", verified: false },
  { box: "14a", labelKa: "დეკლარანტის ს/კ", labelEn: "Declarant code", path: "ASYCUDA/Declarant/Declarant_code", level: "header", verified: false },
  { box: "15", labelKa: "გამგზავნი ქვეყანა", labelEn: "Country of export / dispatch", path: "ASYCUDA/General_information/Country/Export/Export_country_code", level: "header", verified: false },
  { box: "16", labelKa: "წარმოშობის ქვეყანა", labelEn: "Country of origin", path: "ASYCUDA/General_information/Country/Country_of_origin_name", level: "header", verified: false },
  { box: "17", labelKa: "დანიშნულების ქვეყანა", labelEn: "Country of destination", path: "ASYCUDA/General_information/Country/Destination/Destination_country_code", level: "header", verified: false },
  { box: "18", labelKa: "სატრანსპორტო საშუალება ჩამოსვლისას", labelEn: "Means of transport at arrival", path: "ASYCUDA/Transport/Means_of_transport/Departure_arrival_information/Identity", level: "header", verified: false },
  { box: "20", labelKa: "მიწოდების პირობები (Incoterms)", labelEn: "Delivery terms", path: "ASYCUDA/Transport/Delivery_terms/Code", level: "header", verified: false },
  { box: "20b", labelKa: "მიწოდების ადგილი", labelEn: "Delivery place", path: "ASYCUDA/Transport/Delivery_terms/Place", level: "header", verified: false },
  { box: "22", labelKa: "ინვოისის ვალუტა", labelEn: "Invoice currency", path: "ASYCUDA/Valuation/Gs_Invoice/Currency_code", level: "header", verified: false },
  { box: "22b", labelKa: "ინვოისის ჯამური ღირებულება", labelEn: "Total invoice amount", path: "ASYCUDA/Valuation/Gs_Invoice/Amount_foreign_currency", level: "header", verified: false },
  { box: "23", labelKa: "ვალუტის კურსი", labelEn: "Exchange rate", path: "ASYCUDA/Valuation/Gs_Invoice/Currency_rate", level: "header", verified: false },
  { box: "25", labelKa: "ტრანსპორტის სახე საზღვარზე", labelEn: "Mode of transport at border", path: "ASYCUDA/Transport/Means_of_transport/Border_information/Mode", level: "header", verified: false },
  { box: "29", labelKa: "შემოსვლის საბაჟო ორგანო", labelEn: "Office of entry", path: "ASYCUDA/Transport/Border_office/Code", level: "header", verified: false },
  { box: "30", labelKa: "საქონლის ადგილმდებარეობა", labelEn: "Location of goods", path: "ASYCUDA/Transport/Location_of_goods", level: "header", verified: false },
  { box: "A", labelKa: "საბაჟო ორგანო (გეზი)", labelEn: "Customs office", path: "ASYCUDA/Identification/Office_segment/Customs_clearance_office_code", level: "header", verified: false },
  { box: "31", labelKa: "საქონლის აღწერა", labelEn: "Description of goods", path: "ASYCUDA/Item/Goods_description/Description_of_goods", level: "item", verified: false },
  { box: "31b", labelKa: "ადგილების რაოდენობა და სახე", labelEn: "Packages", path: "ASYCUDA/Item/Packages/Number_of_packages", level: "item", verified: false },
  { box: "32", labelKa: "პოზიციის ნომერი", labelEn: "Item number", path: "ASYCUDA/Item (order)", level: "item", verified: false },
  { box: "33", labelKa: "სასაქონლო კოდი (HS)", labelEn: "Commodity code", path: "ASYCUDA/Item/Tarification/HScode/Commodity_code + Precision_1", level: "item", verified: false },
  { box: "34", labelKa: "წარმოშობის ქვეყნის კოდი", labelEn: "Country of origin code", path: "ASYCUDA/Item/Goods_description/Country_of_origin_code", level: "item", verified: false },
  { box: "35", labelKa: "ბრუტო წონა (კგ)", labelEn: "Gross mass (kg)", path: "ASYCUDA/Item/Valuation_item/Weight_itm/Gross_weight_itm", level: "item", verified: false },
  { box: "37", labelKa: "პროცედურა", labelEn: "Procedure", path: "ASYCUDA/Item/Tarification/Extended_customs_procedure + National_customs_procedure", level: "item", verified: false },
  { box: "38", labelKa: "ნეტო წონა (კგ)", labelEn: "Net mass (kg)", path: "ASYCUDA/Item/Valuation_item/Weight_itm/Net_weight_itm", level: "item", verified: false },
  { box: "41", labelKa: "დამატებითი ერთეული", labelEn: "Supplementary units", path: "ASYCUDA/Item/Tarification/Supplementary_unit/Suppplementary_unit_quantity", level: "item", verified: false },
  { box: "42", labelKa: "პოზიციის ფასი (ინვოისი)", labelEn: "Item price", path: "ASYCUDA/Item/Tarification/Item_price", level: "item", verified: false },
  { box: "44", labelKa: "დამატებითი ინფორმაცია / დოკუმენტები", labelEn: "Additional information / documents", path: "ASYCUDA/Item/Attached_documents", level: "item", verified: false },
  { box: "46", labelKa: "სტატისტიკური ღირებულება", labelEn: "Statistical value", path: "ASYCUDA/Item/Valuation_item/Statistical_value", level: "item", verified: false },
  { box: "47", labelKa: "გადასახდელების გამოთვლა", labelEn: "Calculation of taxes", path: "ASYCUDA/Item/Taxation/Taxation_line", level: "item", verified: false },
  { box: "B", labelKa: "სულ გადასახდელი", labelEn: "Total payable", path: "ASYCUDA/Financial/Amount_to_be_paid", level: "header", verified: false },
];

/** Georgian tax codes used in box 47 [UNVERIFIED — commonly "IMP"/"VAT"/"EXC" style codes vary by country]. */
export const GE_TAX_CODES = { duty: "DUT", excise: "EXC", vat: "VAT", fee: "FEE" } as const;

/** Attached document codes for box 44 [UNVERIFIED — verify against RS code list]. */
export const GE_DOC_CODES: Record<string, { code: string; nameKa: string }> = {
  invoice: { code: "380", nameKa: "კომერციული ინვოისი" },
  packing_list: { code: "271", nameKa: "შეფუთვის სია" },
  cmr: { code: "730", nameKa: "CMR" },
  bl: { code: "705", nameKa: "კონოსამენტი" },
  awk: { code: "740", nameKa: "ავიაზედნადები" },
  awb: { code: "740", nameKa: "ავიაზედნადები" },
  eur1: { code: "954", nameKa: "EUR.1" },
  ct1: { code: "861", nameKa: "CT-1" },
  form_a: { code: "865", nameKa: "Form A" },
  phyto: { code: "851", nameKa: "ფიტოსანიტარიული სერტიფიკატი" },
  vet: { code: "853", nameKa: "ვეტერინარული სერტიფიკატი" },
  license: { code: "811", nameKa: "ლიცენზია" },
  other: { code: "ZZZ", nameKa: "სხვა" },
};
