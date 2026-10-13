# Assumptions & unverified items

Every `[UNVERIFIED]` / `[ASSUMPTION]` from the brief, where it lives in code, and who/how to verify.
Sources: `research.md`, `strategy.md`, `CLAUDE_CODE_BRIEF.md` (Oct 2026). RS hotline: 2 299 299.

| # | Item | Status | Where in code | How to verify |
|---|------|--------|---------------|---------------|
| 1 | Fee tiers 50/150/200 (82), 100/300/400 (82¹/82²/54¹), 100/400/500 (54); thresholds ≤3 000 / 3 000–15 000 / >15 000 ₾ | VERIFIED (№96 as amended by №201/2022) but **20+ amendments since** → `needs_reverification = true` | `src/db/seed/reference.ts`, `fee_schedules` | matsne consolidated text of Decree №96 (paid/auth); RS hotline; compare rs.ge p=841 (still shows 100/300/400 in 2026) |
| 2 | Doubling of line 54¹ (post-arrival self) off-hours | UNVERIFIED (research says doubling applies to 54, 54³, 82², 82⁴) → seeded `doubles_off_hours=false` | `fee_schedules.post_arrival_self` | RS hotline / №96 text |
| 3 | Off-hours definition (Mon–Fri 18:00–10:00, Sat 18:00→Mon 10:00, holidays; Poti 21:00) | VERIFIED | `working_hours`, `src/lib/customs/working-hours.ts` | — |
| 4 | Public holiday list | ASSUMPTION (2026 list typed from general knowledge) | `holidays` table, admin-editable | Government calendar / RS |
| 5 | FX rule: NBG official rate on registration day | VERIFIED (Customs Code art.8) | `src/lib/customs/fx.ts`, `shipments.declaration_registration_date` | — |
| 6 | NBG rates endpoint `NBG_RATES_URL` and its JSON shape | UNVERIFIED | `.env.example`, `parseNbgPayload()`; manual override with note + audit | nbg.gov.ge developer page |
| 7 | VAT 18% on (CV + duty) | VERIFIED; **excise in VAT base** UNVERIFIED → flag `vat_includes_excise` (default true) | `app_settings`, `src/lib/customs/duties.ts` | Tax Code VAT base article; RS |
| 8 | Rounding rule for duties | UNVERIFIED → `rounding_mode` setting (default half_up, 2dp) | `app_settings`, `src/lib/money.ts` | RS / Tax Code |
| 9 | Incoterms → customs value additions (EXW/FCA/FAS/FOB +freight +insurance; CFR/CPT +insurance; CIF/CIP none) | VERIFIED concept; DAP/DPU/DDP post-border deduction and default insurance % UNVERIFIED | `src/lib/customs/incoterms.ts` (`verified` flag), UI "შეამოწმე" badge | Customs Code valuation chapter; RS |
| 10 | Allocation of freight/insurance to lines by value (default) | ASSUMPTION | `shipments.allocation_basis` | importer choice; RS practice |
| 11 | Penalty 100%/200%, natural person ≤3 000 ₾ 40%/100% | VERIFIED (art.167) — shown as **indicator** | `penalty_rules`, `src/lib/customs/penalty.ts` | — |
| 12 | Penalty formula max(0, heaviest candidate burden − selected) × % | ASSUMPTION (product indicator) | `src/lib/customs/calculate.ts` | n/a (not legal advice) |
| 13 | HS confidence thresholds 0.75 (yellow) / 0.5 (red) | ASSUMPTION | `app_settings.hs_confidence_*` | eval results |
| 14 | Value-risk thresholds: 90 days, n≥3, >20% medium, >40% high | ASSUMPTION (RS compares to 90-day base — VERIFIED from legali.ge case; its DB is not public) | `app_settings.value_risk`, `src/lib/customs/value-risk.ts` | pilot outcomes |
| 15 | Red-corridor value evidence package contents | ASSUMPTION | `docs/guide-content/checklists.json` | pilot / RS feedback |
| 16 | All checklist contents (documents, yellow, red physical, eCustoms import, payment) | ASSUMPTION | `docs/guide-content/checklists.json` | pilot |
| 17 | SAD XML structure (ASYCUDA World "Import/Export XML File") | VERIFIED to exist (UNCTAD); **Georgian national fields / XSD / button enabled** UNVERIFIED → `experimental` badge, `validated_against_real_sample=false` | `src/lib/export/sad-xml/*`, `app_settings.xml_validated_against_real_sample` | importer's own eCustoms: empty SAD → Export XML; `pnpm xml:diff`; successful import ≥1 |
| 18 | Procedure code `4000`, tax codes DUT/EXC/VAT, document codes (380/730/705…) | UNVERIFIED | `profiles/ge.ts` | RS code lists; real sample |
| 19 | eCustoms access: employee register + no fee debt; office codes 11111/11112/11113/11114/69501 | VERIFIED (rs.ge p=84) | `ecustoms_profiles`, onboarding wizard | — |
| 20 | Access fees 200/300/500 ₾ for 3/6/12 months | VERIFIED (№96 line 46) | `ecustoms_access_fees` | — |
| 21 | E-signature / ID card requirement; fee for additional office code | UNVERIFIED → "დასაზუსტებელია" badge | onboarding wizard | RS hotline |
| 22 | Mandatory training | Not found (conclusion) | wizard note | RS |
| 23 | Register instructions for sole proprietors / new LLCs | ASSUMPTION | `docs/guide-content/ecustoms-access.md` | rs.ge |
| 24 | Broker comparison 100 ₾ × unique HS (ganbajeba) or 150 ₾/declaration (georgiacb) | VERIFIED prices; formula choice ASSUMPTION | `organizations.broker_cost_per_hs_gel`, `app_settings` | — |
| 25 | Pricing plans (free / 29–39 / 59 / 129–149 / 50–99) | ASSUMPTION | `/pricing`, `subscriptions` | market test |
| 26 | Money/date format `1 234,56 ₾`, `DD.MM.YYYY` | ASSUMPTION | `src/lib/money.ts`, `src/lib/format.ts` | user preference |
| 27 | RS expert HS determination 30 ₾; advance ruling 0/250/500 ₾ | VERIFIED (№96 lines 60/48) | `rs_service_fees` | — |
| 28 | Pre-arrival ≤45 days | VERIFIED | `preArrivalWindowCheck()` | — |
| 29 | Viber Bot API terms/pricing | UNVERIFIED → `FEATURE_VIBER` flag | `src/lib/intake/viber.ts` | Viber docs |
| 30 | Inbound email provider | ASSUMPTION (generic JSON webhook with shared secret) | `src/app/api/intake/email/route.ts` | choose Resend/Postmark |
| 31 | Georgian payment provider | ASSUMPTION → `PaymentProvider` interface, mock | `src/lib/billing/*` | BOG / TBC |
| 32 | Placeholder tariff (50 lines) | NOT REAL DATA — marked `[PLACEHOLDER]`, `is_placeholder=true`; export blocked in production | `src/db/seed/tariff.placeholder.csv` | Import official tariff CSV at `/admin/tariff` |

## Blocking inputs still needed (brief §13)
1. Official Georgian tariff CSV (HS + rates).
2. ≥1 real SAD XML from an importer's own eCustoms (+ empty SAD export).
3. 10–30 anonymized real invoices with confirmed HS (ground truth) → `tests/fixtures/invoices/`.
4. Confirmation of №96 lines 54/54¹/82/82¹/82² current wording and 54¹ doubling.
5. NBG endpoint; VAT base excise inclusion; rounding; holiday list.
6. Domain, inbound email provider, Telegram bot token, payment provider.
