# SAD XML mapping (profile `ge`, EXPERIMENTAL)

Status: **not validated against a real Georgian eCustoms sample.** `exports.validated_against_real_sample = false`
until (a) `pnpm xml:diff` reports 0 critical differences against ≥1 real XML exported from an importer's own
eCustoms and (b) the XML imported successfully at least once (brief §7).

Base structure: UNCTAD ASYCUDA World SAD XML (one `<ASYCUDA>` document, header segments + repeated `<Item>`).
Mapping source of truth: `src/lib/export/sad-xml/profiles/ge.ts` (`GE_BOX_MAPPINGS`), builder: `builder.ts`.

## Header

| SAD box | Element | Our value | Verified |
|---|---|---|---|
| A | `Identification/Office_segment/Customs_clearance_office_code` | `shipments.destination_office` (11111/11112/11113/11114/69501) | no |
| 1 | `Identification/Type/Type_of_declaration` + `Declaration_gen_procedure_code` | `IM` + `4` | no |
| 2 | `Traders/Exporter/Exporter_name` | supplier name + address + country | no |
| 5/6 | `Property/Nbers/Total_number_of_items` / `Total_number_of_packages` | count / `shipments.packages` | no |
| 7 | `Declarant/Reference/Number` | `shipments.reference` | no |
| 8 | `Traders/Consignee/Consignee_code` / `_name` | org tax id / name | no |
| 14 | `Declarant/Declarant_code` / `_name` | org tax id / name (importer is the declarant) | no |
| 15 | `General_information/Country/Export/Export_country_code` | `dispatch_country` | no |
| 16 | `General_information/Country/Country_of_origin_name` | `origin_country` | no |
| 17 | `Destination/Destination_country_code` | `GE` | no |
| 20 | `Transport/Delivery_terms/Code` / `Place` | incoterm / place | no |
| 22/23 | `Valuation/Gs_Invoice/Currency_code`, `Amount_foreign_currency`, `Currency_rate` | invoice currency / total / NBG rate on registration day | rule verified, element no |
| 25 | `Transport/Means_of_transport/Border_information/Mode` | transport mode code | no |
| 29 | `Transport/Border_office/Code` | `border_post` | no |
| B | `Financial/Amount_to_be_paid` | total payable (duty + excise + VAT + fee) | no |

## Item (repeated)

| SAD box | Element | Our value | Verified |
|---|---|---|---|
| 31 | `Goods_description/Description_of_goods` / `Commercial_Description` | normalized Georgian / raw | no |
| 33 | `Tarification/HScode/Commodity_code` (8) + `Precision_1` (2) | 10-digit HS split 8+2 | no |
| 34 | `Goods_description/Country_of_origin_code` | line origin | no |
| 35/38 | `Valuation_item/Weight_itm/Gross_weight_itm` / `Net_weight_itm` | line weights | no |
| 37 | `Tarification/Extended_customs_procedure` + `National_customs_procedure` | `4000` + `000` | no |
| 41 | `Tarification/Supplementary_unit/Suppplementary_unit_quantity` | quantity | no |
| 42 | `Tarification/Item_price` | line invoice value (foreign) | no |
| 44 | `Attached_documents/*` | document codes (380 invoice, 730 CMR, …) | no |
| 46 | `Valuation_item/Statistical_value` | customs value GEL | no |
| 47 | `Taxation/Taxation_line` ×3 | DUT / EXC / VAT base, rate, amount | no |

## Validation workflow
1. Importer exports an **empty SAD** and a **real declaration** from their eCustoms → upload in the onboarding wizard (stored as `documents.kind = sad_xml_sample`) or copy to `tests/fixtures/sad-xml/real/` (gitignored); anonymized copy to `tests/fixtures/sad-xml/anon/`.
2. `pnpm xml:diff tests/fixtures/sad-xml/anon/<file>.xml [--values]` builds our XML from `tests/unit/xml.test.ts` sample model and prints missing/extra/order/attr diffs; exit code 1 if critical > 0.
3. Fix `profiles/ge.ts` + `builder.ts`, bump `GE_PROFILE_VERSION`, re-run until critical = 0.
4. After a successful import in eCustoms, set `app_settings.xml_validated_against_real_sample = true` from `/admin/xml-samples`.
5. If import is not available in the Georgian client: keep the sheet + XLS as the product; hide XML via `FEATURE_XML_EXPORT=false`.
