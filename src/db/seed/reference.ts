/**
 * Reference data seed. Everything marked VERIFIED comes from research.md (Decree №96 as amended by
 * №201/2022, Customs Code art.8/167, rs.ge p=84/p=841). All fee rows carry needs_reverification = true
 * because №96 has had 20+ amendments since 2022 (last 06.07.2026) — see docs/assumptions.md.
 */
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { eq } from "drizzle-orm";

export const FEE_EFFECTIVE_FROM = "2022-05-14"; // №201 of 14.04.2022 in force from the 30th day [VERIFIED]

type Tier = [string, string | null];
const TIERS: Tier[] = [
  ["0.00", "3000.00"],
  ["3000.01", "15000.00"],
  ["15000.01", null],
];

const FEE_TABLE: { mode: (typeof schema.feeMode.enumValues)[number]; fees: [string, string, string]; doubles: boolean; ref: string }[] = [
  { mode: "pre_arrival_self", fees: ["50.00", "150.00", "200.00"], doubles: false, ref: "Decree №96 line 82" },
  { mode: "pre_arrival_rs_staff_electronic", fees: ["100.00", "300.00", "400.00"], doubles: false, ref: "Decree №96 line 82¹" },
  { mode: "pre_arrival_rs_staff_paper", fees: ["100.00", "300.00", "400.00"], doubles: true, ref: "Decree №96 line 82²" },
  { mode: "post_arrival_self", fees: ["100.00", "300.00", "400.00"], doubles: false, ref: "Decree №96 line 54¹ [UNVERIFIED doubling]" },
  { mode: "post_arrival_rs_staff", fees: ["100.00", "400.00", "500.00"], doubles: true, ref: "Decree №96 line 54" },
];

export const GE_OFFICES = [
  { code: "11111", name_ka: "გეზი თბილისი", name_en: "CEZ Tbilisi" },
  { code: "11112", name_ka: "გეზი ბათუმი", name_en: "CEZ Batumi" },
  { code: "11113", name_ka: "გეზი ფოთი", name_en: "CEZ Poti" },
  { code: "11114", name_ka: "გეზი აეროპორტი", name_en: "CEZ Airport" },
  { code: "69501", name_ka: "ფოთის პორტი", name_en: "Poti port" },
  { code: "ECEZ", name_ka: "ელექტრონული გეზი (e-CEZ)", name_en: "e-CEZ" },
];

export async function seedReference(db: Db) {
  // Fee schedules
  const existingFees = await db.select().from(schema.feeSchedules).limit(1);
  if (existingFees.length === 0) {
    for (const row of FEE_TABLE) {
      for (let i = 0; i < TIERS.length; i++) {
        await db.insert(schema.feeSchedules).values({
          countryCode: "GE",
          effectiveFrom: FEE_EFFECTIVE_FROM,
          mode: row.mode,
          valueMin: TIERS[i]![0],
          valueMax: TIERS[i]![1],
          feeGel: row.fees[i]!,
          doublesOffHours: row.doubles,
          legalRef: row.ref,
          needsReverification: true,
        });
      }
    }
  }

  // Working hours [VERIFIED]: Mon–Sat 10:00–18:00, Sunday closed; Poti (11113, 69501) until 21:00.
  const wh = await db.select().from(schema.workingHours).limit(1);
  if (wh.length === 0) {
    const ref = "Decree №96 (off-hours doubling rule)";
    for (let d = 0; d <= 6; d++) {
      const closed = d === 0;
      await db.insert(schema.workingHours).values({ countryCode: "GE", officeCode: null, weekday: d, opensAt: closed ? null : "10:00", closesAt: closed ? null : "18:00", legalRef: ref });
      for (const office of ["11113", "69501"]) {
        await db.insert(schema.workingHours).values({ countryCode: "GE", officeCode: office, weekday: d, opensAt: closed ? null : "10:00", closesAt: closed ? null : "21:00", legalRef: ref + " — Poti 21:00" });
      }
    }
  }

  // Holidays [ASSUMPTION: list needs confirmation; admin edits]
  const hol = await db.select().from(schema.holidays).limit(1);
  if (hol.length === 0) {
    const list: [string, string][] = [
      ["2026-01-01", "ახალი წელი"],
      ["2026-01-02", "ახალი წელი"],
      ["2026-01-07", "შობა"],
      ["2026-01-19", "ნათლისღება"],
      ["2026-03-03", "დედის დღე"],
      ["2026-03-08", "ქალთა საერთაშორისო დღე"],
      ["2026-04-09", "ეროვნული ერთიანობის დღე"],
      ["2026-04-10", "დიდი პარასკევი"],
      ["2026-04-11", "დიდი შაბათი"],
      ["2026-04-12", "აღდგომა"],
      ["2026-04-13", "აღდგომის მეორე დღე"],
      ["2026-05-09", "გამარჯვების დღე"],
      ["2026-05-12", "წმ. ანდრია პირველწოდებულის ხსენების დღე"],
      ["2026-05-26", "დამოუკიდებლობის დღე"],
      ["2026-08-28", "მარიამობა"],
      ["2026-10-14", "მცხეთობა (სვეტიცხოვლობა)"],
      ["2026-11-23", "გიორგობა"],
    ];
    for (const [date, name] of list) await db.insert(schema.holidays).values({ countryCode: "GE", date, name, needsReverification: true });
  }

  // RS service fees [VERIFIED]
  const rs = await db.select().from(schema.rsServiceFees).limit(1);
  if (rs.length === 0) {
    await db.insert(schema.rsServiceFees).values([
      { key: "hs_expert_determination", labelKa: "HS კოდის დადგენა RS-ის ექსპერტის მიერ", feeGel: "30.00", daysOrUnit: "1 სახეობა", legalRef: "Decree №96 line 60" },
      { key: "advance_ruling_hs_30d", labelKa: "წინასწარი გადაწყვეტილება HS-ზე (30 დღე)", feeGel: "0.00", daysOrUnit: "30 დღე", legalRef: "Decree №96 line 48" },
      { key: "advance_ruling_hs_15d", labelKa: "წინასწარი გადაწყვეტილება HS-ზე (15 დღე)", feeGel: "250.00", daysOrUnit: "15 დღე", legalRef: "Decree №96 line 48" },
      { key: "advance_ruling_hs_10d", labelKa: "წინასწარი გადაწყვეტილება HS-ზე (10 დღე)", feeGel: "500.00", daysOrUnit: "10 დღე", legalRef: "Decree №96 line 48" },
    ]);
  }

  // eCustoms access fees [VERIFIED, №96 line 46]
  const af = await db.select().from(schema.ecustomsAccessFees).limit(1);
  if (af.length === 0) {
    await db.insert(schema.ecustomsAccessFees).values([
      { termMonths: 3, feeGel: "200.00", legalRef: "Decree №96 line 46" },
      { termMonths: 6, feeGel: "300.00", legalRef: "Decree №96 line 46" },
      { termMonths: 12, feeGel: "500.00", legalRef: "Decree №96 line 46" },
    ]);
  }

  // Penalty rules [VERIFIED, Customs Code art.167]
  const pr = await db.select().from(schema.penaltyRules).limit(1);
  if (pr.length === 0) {
    await db.insert(schema.penaltyRules).values([
      { rule: "underpaid_first", percent: "100.00", thresholdGel: null, legalRef: "Customs Code art.167" },
      { rule: "underpaid_repeat", percent: "200.00", thresholdGel: null, legalRef: "Customs Code art.167" },
      { rule: "natural_person_small_first", percent: "40.00", thresholdGel: "3000.00", legalRef: "Customs Code art.167 §3" },
      { rule: "natural_person_small_repeat", percent: "100.00", thresholdGel: "3000.00", legalRef: "Customs Code art.167 §3" },
    ]);
  }

  // Country profile GE
  const cp = await db.query.countryProfiles.findFirst({ where: eq(schema.countryProfiles.countryCode, "GE") });
  if (!cp) {
    await db.insert(schema.countryProfiles).values({
      countryCode: "GE",
      nameKa: "საქართველო",
      currency: "GEL",
      vatRate: "18.000",
      vatIncludesExcise: true,
      feeScheduleRef: "GE",
      xmlProfile: "ge",
      locale: "ka",
      offices: GE_OFFICES,
      enabled: true,
    });
  }

  // App settings (configurable thresholds, all [ASSUMPTION])
  const defaults: Record<string, { value: unknown; note: string }> = {
    hs_confidence_yellow: { value: 0.75, note: "[ASSUMPTION] below this a line is yellow" },
    hs_confidence_red: { value: 0.5, note: "[ASSUMPTION] below this a line is red + advance ruling recommended" },
    value_risk: { value: { windowDays: 90, minSamples: 3, mediumBelowPct: 20, highBelowPct: 40 }, note: "[ASSUMPTION] see brief §5.5a" },
    rounding_mode: { value: "half_up", note: "[UNVERIFIED] rounding rule" },
    vat_includes_excise: { value: true, note: "[UNVERIFIED] excise in VAT base" },
    broker_cost_per_hs_gel: { value: "100.00", note: "[VERIFIED] ganbajeba.ge 100 ₾ / HS code" },
    broker_cost_per_declaration_gel: { value: "150.00", note: "[VERIFIED] georgiacb.com 150 ₾ / declaration" },
    money_format: { value: "1 234,56 ₾", note: "[ASSUMPTION]" },
    xml_validated_against_real_sample: { value: false, note: "Set true only after xml:diff = 0 on a real importer sample AND successful eCustoms import (brief §7)" },
  };
  for (const [key, v] of Object.entries(defaults)) {
    const ex = await db.query.appSettings.findFirst({ where: eq(schema.appSettings.key, key) });
    if (!ex) await db.insert(schema.appSettings).values({ key, value: v.value as never, note: v.note });
  }
}
