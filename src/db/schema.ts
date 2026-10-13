/**
 * Drizzle schema — Customs Copilot GE.
 * Every tenant table carries organization_id (indexed). Money is numeric(14,2), never float.
 * Tariff / fee / FX data is versioned, never hardcoded in calculation code.
 */
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  date,
  index,
  uniqueIndex,
  primaryKey,
  customType,
  pgEnum,
} from "drizzle-orm/pg-core";

export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const money = (name: string) => numeric(name, { precision: 14, scale: 2 });

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */
export const membershipRole = pgEnum("membership_role", ["owner", "member", "viewer"]);
export const accessStatus = pgEnum("ecustoms_access_status", ["none", "applied", "active", "expired"]);
export const feeMode = pgEnum("fee_mode", [
  "pre_arrival_self",
  "pre_arrival_rs_staff_electronic",
  "pre_arrival_rs_staff_paper",
  "post_arrival_self",
  "post_arrival_rs_staff",
]);
export const shipmentStatus = pgEnum("shipment_status", [
  "draft",
  "extracting",
  "review_lines",
  "classifying",
  "calculating",
  "awaiting_approval",
  "approved",
  "exported",
  "imported_to_ecustoms",
  "assessed",
  "paid",
  "corridor_green",
  "corridor_blue",
  "corridor_yellow",
  "corridor_red",
  "released",
  "closed",
  "cancelled",
]);
export const documentKind = pgEnum("document_kind", [
  "invoice",
  "packing_list",
  "cmr",
  "bl",
  "awb",
  "eur1",
  "ct1",
  "form_a",
  "phyto",
  "vet",
  "license",
  "sad_xml_sample",
  "other",
]);
export const documentSource = pgEnum("document_source", ["upload", "email", "telegram", "viber"]);
export const hsSource = pgEnum("hs_source", ["ai", "client_memory", "manual"]);
export const exportKind = pgEnum("export_kind", ["sad_xml", "sheet_pdf", "xls", "evidence_zip"]);
export const checklistKind = pgEnum("checklist_kind", [
  "documents",
  "yellow_corridor",
  "red_corridor_physical",
  "red_corridor_value",
  "ecustoms_access",
  "ecustoms_import",
  "payment",
]);
export const actorType = pgEnum("actor_type", ["user", "ai", "system"]);
export const aiPurpose = pgEnum("ai_purpose", ["extract", "classify", "explain"]);
export const fxSource = pgEnum("fx_source", ["manual", "nbg"]);
export const priceRefSource = pgEnum("price_ref_source", ["own_history", "user_reference"]);
export const intakeKind = pgEnum("intake_kind", ["email", "telegram", "viber"]);
export const intakeStatus = pgEnum("intake_status", ["received", "attached", "ignored", "error"]);
export const corridor = pgEnum("corridor", ["green", "blue", "yellow", "red"]);
export const redReason = pgEnum("red_reason", ["physical", "value", "documents", "unknown"]);

/* ------------------------------------------------------------------ */
/* Tenancy & users                                                     */
/* ------------------------------------------------------------------ */
export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  taxId: text("tax_id"),
  legalForm: text("legal_form"),
  address: text("address"),
  defaultCurrency: text("default_currency").notNull().default("USD"),
  locale: text("locale").notNull().default("ka"),
  countryCode: text("country_code").notNull().default("GE"),
  plan: text("plan").notNull().default("free"),
  isNaturalPerson: boolean("is_natural_person").notNull().default(false),
  brokerCostPerHsGel: money("broker_cost_per_hs_gel").notNull().default("100.00"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable("users", {
  id: id(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  isSuperadmin: boolean("is_superadmin").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull().default("member"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("memberships_org_user").on(t.organizationId, t.userId), index("memberships_user").on(t.userId)],
);

export const invitations = pgTable("invitations", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: membershipRole("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** eCustoms access profile. NO personal number, NO credentials are stored here (brief §4). */
export const ecustomsProfiles = pgTable("ecustoms_profiles", {
  id: id(),
  organizationId: uuid("organization_id").notNull().unique().references(() => organizations.id, { onDelete: "cascade" }),
  accessStatus: accessStatus("access_status").notNull().default("none"),
  accessValidUntil: date("access_valid_until"),
  accessTermMonths: integer("access_term_months"),
  employeeName: text("employee_name"),
  employeeInRegister: boolean("employee_in_register").notNull().default(false),
  noFeeDebtConfirmed: boolean("no_fee_debt_confirmed").notNull().default(false),
  customsOfficeCodes: text("customs_office_codes").array().notNull().default(sql`'{}'::text[]`),
  applicationSubmittedAt: timestamp("application_submitted_at", { withTimezone: true }),
  emptySadSampleDocumentId: uuid("empty_sad_sample_document_id"),
  wizardStep: integer("wizard_step").notNull().default(0),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------------ */
/* Reference data (versioned)                                          */
/* ------------------------------------------------------------------ */
export const suppliers = pgTable(
  "suppliers",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    country: text("country"),
    address: text("address"),
    taxId: text("tax_id"),
    defaultIncoterm: text("default_incoterm"),
    defaultCurrency: text("default_currency"),
    defaultOriginCountry: text("default_origin_country"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("suppliers_org").on(t.organizationId)],
);

export const tariffVersions = pgTable("tariff_versions", {
  id: id(),
  countryCode: text("country_code").notNull().default("GE"),
  source: text("source").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  isActive: boolean("is_active").notNull().default(false),
  checksum: text("checksum").notNull(),
  lineCount: integer("line_count").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type SpecificRate = { amount_gel: string; per: "unit" | "kg" | "litre" };

export const tariffLines = pgTable(
  "tariff_lines",
  {
    id: id(),
    tariffVersionId: uuid("tariff_version_id").notNull().references(() => tariffVersions.id, { onDelete: "cascade" }),
    hsCode: text("hs_code").notNull(),
    descriptionKa: text("description_ka").notNull(),
    descriptionEn: text("description_en").notNull().default(""),
    chapterNotes: text("chapter_notes"),
    headingNotes: text("heading_notes"),
    dutyRate: numeric("duty_rate", { precision: 7, scale: 3 }).notNull().default("0"),
    dutySpecific: jsonb("duty_specific").$type<SpecificRate | null>(),
    exciseRate: numeric("excise_rate", { precision: 7, scale: 3 }),
    exciseSpecific: jsonb("excise_specific").$type<SpecificRate | null>(),
    vatExempt: boolean("vat_exempt").notNull().default(false),
    requiresDocs: jsonb("requires_docs").$type<string[]>().notNull().default([]),
    unit: text("unit"),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(hs_code,'') || ' ' || coalesce(description_ka,'') || ' ' || coalesce(description_en,'') || ' ' || coalesce(heading_notes,''))`,
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("tariff_lines_version_code").on(t.tariffVersionId, t.hsCode),
    index("tariff_lines_search").using("gin", t.searchVector),
  ],
);

export const feeSchedules = pgTable("fee_schedules", {
  id: id(),
  countryCode: text("country_code").notNull().default("GE"),
  effectiveFrom: date("effective_from").notNull(),
  mode: feeMode("mode").notNull(),
  valueMin: money("value_min").notNull(),
  valueMax: money("value_max"),
  feeGel: money("fee_gel").notNull(),
  doublesOffHours: boolean("doubles_off_hours").notNull().default(false),
  legalRef: text("legal_ref").notNull(),
  needsReverification: boolean("needs_reverification").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Working hours: one row per weekday (0=Sunday..6=Saturday). null opens/closes = closed all day. office_code null = default. */
export const workingHours = pgTable("working_hours", {
  id: id(),
  countryCode: text("country_code").notNull().default("GE"),
  officeCode: text("office_code"),
  weekday: integer("weekday").notNull(),
  opensAt: text("opens_at"),
  closesAt: text("closes_at"),
  legalRef: text("legal_ref"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const holidays = pgTable("holidays", {
  id: id(),
  countryCode: text("country_code").notNull().default("GE"),
  date: date("date").notNull(),
  name: text("name").notNull(),
  needsReverification: boolean("needs_reverification").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const rsServiceFees = pgTable("rs_service_fees", {
  id: id(),
  countryCode: text("country_code").notNull().default("GE"),
  key: text("key").notNull(),
  labelKa: text("label_ka").notNull(),
  feeGel: money("fee_gel").notNull(),
  daysOrUnit: text("days_or_unit"),
  legalRef: text("legal_ref").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const ecustomsAccessFees = pgTable("ecustoms_access_fees", {
  id: id(),
  countryCode: text("country_code").notNull().default("GE"),
  termMonths: integer("term_months").notNull(),
  feeGel: money("fee_gel").notNull(),
  legalRef: text("legal_ref").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const fxRates = pgTable(
  "fx_rates",
  {
    id: id(),
    currency: text("currency").notNull(),
    date: date("date").notNull(),
    rateGel: numeric("rate_gel", { precision: 14, scale: 6 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    source: fxSource("source").notNull(),
    note: text("note"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("fx_rates_currency_date_source").on(t.currency, t.date, t.source)],
);

export const priceReferences = pgTable(
  "price_references",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    hsCode: text("hs_code").notNull(),
    originCountry: text("origin_country"),
    unitBasis: text("unit_basis").notNull().$type<"per_kg" | "per_unit">(),
    unitPriceGel: numeric("unit_price_gel", { precision: 14, scale: 4 }).notNull(),
    observedAt: date("observed_at").notNull(),
    source: priceRefSource("source").notNull(),
    shipmentId: uuid("shipment_id"),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("price_refs_org_hs").on(t.organizationId, t.hsCode, t.observedAt)],
);

export const penaltyRules = pgTable("penalty_rules", {
  id: id(),
  countryCode: text("country_code").notNull().default("GE"),
  rule: text("rule").notNull(),
  percent: numeric("percent", { precision: 6, scale: 2 }).notNull(),
  thresholdGel: money("threshold_gel"),
  legalRef: text("legal_ref").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  note: text("note"),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------------ */
/* Operational                                                         */
/* ------------------------------------------------------------------ */
export type OtherCost = { label: string; amount: string; currency: string; included: boolean };

export const shipments = pgTable(
  "shipments",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    reference: text("reference").notNull(),
    status: shipmentStatus("status").notNull().default("draft"),
    mode: feeMode("mode").notNull().default("pre_arrival_self"),
    incoterm: text("incoterm"),
    incotermPlace: text("incoterm_place"),
    currency: text("currency").notNull().default("USD"),
    invoiceNumber: text("invoice_number"),
    invoiceDate: date("invoice_date"),
    invoiceTotal: money("invoice_total"),
    freightAmount: money("freight_amount"),
    freightCurrency: text("freight_currency"),
    insuranceAmount: money("insurance_amount"),
    insuranceCurrency: text("insurance_currency"),
    otherCosts: jsonb("other_costs").$type<OtherCost[]>().notNull().default([]),
    allocationBasis: text("allocation_basis").notNull().default("value").$type<"value" | "weight">(),
    originCountry: text("origin_country"),
    dispatchCountry: text("dispatch_country"),
    transportMode: text("transport_mode"),
    transportDocNo: text("transport_doc_no"),
    borderPost: text("border_post"),
    destinationOffice: text("destination_office"),
    expectedArrivalDate: date("expected_arrival_date"),
    grossWeightKg: numeric("gross_weight_kg", { precision: 14, scale: 3 }),
    netWeightKg: numeric("net_weight_kg", { precision: 14, scale: 3 }),
    packages: integer("packages"),
    assessmentNumber: text("assessment_number"),
    corridor: corridor("corridor"),
    redReason: redReason("red_reason"),
    rsAdjustedValueGel: money("rs_adjusted_value_gel"),
    fxRateId: uuid("fx_rate_id").references(() => fxRates.id),
    declarationRegistrationDate: date("declaration_registration_date"),
    fxRateDateRule: text("fx_rate_date_rule").notNull().default("registration_date"),
    goodsAlreadyArrived: boolean("goods_already_arrived").notNull().default(false),
    supplierNameRaw: text("supplier_name_raw"),
    buyerNameRaw: text("buyer_name_raw"),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("shipments_org").on(t.organizationId, t.createdAt)],
);

export const documents = pgTable(
  "documents",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    shipmentId: uuid("shipment_id").references(() => shipments.id, { onDelete: "cascade" }),
    kind: documentKind("kind").notNull(),
    fileName: text("file_name").notNull(),
    blobUrl: text("blob_url").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    pages: integer("pages"),
    source: documentSource("source").notNull().default("upload"),
    sha256: text("sha256").notNull(),
    extractionStatus: text("extraction_status").notNull().default("pending"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("documents_org_shipment").on(t.organizationId, t.shipmentId)],
);

export type SourceBbox = { page: number; x: number; y: number; w: number; h: number };

export const invoiceLines = pgTable(
  "invoice_lines",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
    lineNo: integer("line_no").notNull(),
    descriptionRaw: text("description_raw").notNull(),
    descriptionNormalizedKa: text("description_normalized_ka"),
    sku: text("sku"),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    unit: text("unit"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 4 }).notNull(),
    lineTotal: money("line_total").notNull(),
    currency: text("currency").notNull(),
    originCountry: text("origin_country"),
    netWeightKg: numeric("net_weight_kg", { precision: 14, scale: 3 }),
    grossWeightKg: numeric("gross_weight_kg", { precision: 14, scale: 3 }),
    extractionConfidence: numeric("extraction_confidence", { precision: 4, scale: 3 }),
    sourceBbox: jsonb("source_bbox").$type<SourceBbox | null>(),
    editedByHuman: boolean("edited_by_human").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("invoice_lines_shipment").on(t.shipmentId, t.lineNo)],
);

export type HsCandidate = {
  hs_code: string;
  confidence: number;
  reasoning_ka: string;
  citations: { tariff_line_id: string; quote: string }[];
  gri_rules: string[];
  duty_rate: string;
  description_ka?: string;
  why_not_others_ka?: string;
};

export type ValueRisk = {
  basis: "per_kg" | "per_unit" | "none";
  own_median: string | null;
  p25: string | null;
  n: number;
  deviation_pct: string | null;
  level: "none" | "low" | "medium" | "high" | "insufficient_data";
  reasons: string[];
};

export const hsDecisions = pgTable(
  "hs_decisions",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    invoiceLineId: uuid("invoice_line_id").notNull().unique().references(() => invoiceLines.id, { onDelete: "cascade" }),
    candidates: jsonb("candidates").$type<HsCandidate[]>().notNull().default([]),
    questionsForUser: jsonb("questions_for_user").$type<string[]>().notNull().default([]),
    suggestedHsCode: text("suggested_hs_code"),
    suggestedConfidence: numeric("suggested_confidence", { precision: 4, scale: 3 }),
    source: hsSource("source").notNull().default("ai"),
    memoryTimesConfirmed: integer("memory_times_confirmed"),
    finalHsCode: text("final_hs_code"),
    humanConfirmed: boolean("human_confirmed").notNull().default(false),
    confirmedBy: uuid("confirmed_by").references(() => users.id),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    overrideReason: text("override_reason"),
    penaltyExposureGel: money("penalty_exposure_gel"),
    advanceRulingRecommended: boolean("advance_ruling_recommended").notNull().default(false),
    valueRisk: jsonb("value_risk").$type<ValueRisk | null>(),
    tariffVersionId: uuid("tariff_version_id").references(() => tariffVersions.id),
    aiRunId: uuid("ai_run_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("hs_decisions_org").on(t.organizationId)],
);

export type CalcLineBreakdown = {
  line_id: string;
  line_no: number;
  hs_code: string;
  description: string;
  invoice_value: string;
  invoice_value_gel: string;
  freight_alloc_gel: string;
  insurance_alloc_gel: string;
  other_alloc_gel: string;
  customs_value_gel: string;
  duty_rate: string;
  duty_gel: string;
  excise_gel: string;
  vat_base_gel: string;
  vat_gel: string;
  total_gel: string;
  formulas: Record<string, string>;
};

export type FeeAlternative = {
  mode: string;
  legal_ref: string;
  base_fee_gel: string;
  doubles_off_hours: boolean;
  off_hours_applied: boolean;
  fee_gel: string;
  needs_reverification: boolean;
};

export const calculations = pgTable(
  "calculations",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    customsValueGel: money("customs_value_gel").notNull(),
    breakdown: jsonb("breakdown").$type<CalcLineBreakdown[]>().notNull(),
    dutyTotal: money("duty_total").notNull(),
    exciseTotal: money("excise_total").notNull(),
    vatTotal: money("vat_total").notNull(),
    feeGel: money("fee_gel").notNull(),
    feeMode: feeMode("fee_mode").notNull(),
    feeOffHours: boolean("fee_off_hours").notNull().default(false),
    feeAlternatives: jsonb("fee_alternatives").$type<FeeAlternative[]>().notNull(),
    brokerCostComparisonGel: money("broker_cost_comparison_gel").notNull(),
    penaltyExposureTotalGel: money("penalty_exposure_total_gel").notNull(),
    valueRiskLevel: text("value_risk_level").notNull().default("none"),
    totalPayableGel: money("total_payable_gel").notNull(),
    fxRate: numeric("fx_rate", { precision: 14, scale: 6 }).notNull(),
    fxCurrency: text("fx_currency").notNull(),
    fxDate: date("fx_date").notNull(),
    fxSource: text("fx_source").notNull(),
    vatRate: numeric("vat_rate", { precision: 6, scale: 3 }).notNull(),
    tariffVersionId: uuid("tariff_version_id").notNull().references(() => tariffVersions.id),
    feeScheduleEffectiveFrom: date("fee_schedule_effective_from").notNull(),
    fxRateId: uuid("fx_rate_id").references(() => fxRates.id),
    assumptions: jsonb("assumptions").$type<string[]>().notNull().default([]),
    approved: boolean("approved").notNull().default(false),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("calculations_shipment").on(t.shipmentId, t.version)],
);

export const exportsTable = pgTable(
  "exports",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
    calculationId: uuid("calculation_id").notNull().references(() => calculations.id),
    kind: exportKind("kind").notNull(),
    blobUrl: text("blob_url").notNull(),
    fileName: text("file_name").notNull(),
    xmlProfileVersion: text("xml_profile_version"),
    validatedAgainstRealSample: boolean("validated_against_real_sample").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("exports_shipment").on(t.shipmentId)],
);

export type ChecklistItem = {
  key: string;
  label_ka: string;
  required: boolean;
  done: boolean;
  doc_id?: string | null;
  hint_ka?: string;
};

export const checklists = pgTable(
  "checklists",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    shipmentId: uuid("shipment_id").references(() => shipments.id, { onDelete: "cascade" }),
    kind: checklistKind("kind").notNull(),
    items: jsonb("items").$type<ChecklistItem[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("checklists_shipment_kind").on(t.shipmentId, t.kind)],
);

/** Append-only. A trigger (migration 0001) rejects UPDATE/DELETE. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    organizationId: uuid("organization_id"),
    actorType: actorType("actor_type").notNull(),
    actorId: text("actor_id"),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_org_created").on(t.organizationId, t.createdAt)],
);

export const aiRuns = pgTable("ai_runs", {
  id: id(),
  organizationId: uuid("organization_id"),
  shipmentId: uuid("shipment_id"),
  purpose: aiPurpose("purpose").notNull(),
  model: text("model").notNull(),
  promptHash: text("prompt_hash").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  latencyMs: integer("latency_ms"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  output: jsonb("output"),
  error: text("error"),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Phase 2                                                             */
/* ------------------------------------------------------------------ */
export const intakeChannels = pgTable(
  "intake_channels",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    kind: intakeKind("kind").notNull(),
    addressOrChatId: text("address_or_chat_id").notNull(),
    verified: boolean("verified").notNull().default(false),
    secret: text("secret").notNull(),
    allowlist: text("allowlist").array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("intake_kind_address").on(t.kind, t.addressOrChatId)],
);

export const intakeMessages = pgTable("intake_messages", {
  id: id(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  channelId: uuid("channel_id").references(() => intakeChannels.id, { onDelete: "set null" }),
  kind: intakeKind("kind").notNull(),
  externalId: text("external_id").notNull(),
  fromAddress: text("from_address"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  rawMeta: jsonb("raw_meta"),
  shipmentId: uuid("shipment_id").references(() => shipments.id, { onDelete: "set null" }),
  status: intakeStatus("status").notNull().default("received"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Written ONLY from human_confirmed = true decisions. Never read across organizations. */
export const clientMemory = pgTable(
  "client_memory",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    productKey: text("product_key").notNull(),
    descriptionRaw: text("description_raw"),
    hsCode: text("hs_code").notNull(),
    timesConfirmed: integer("times_confirmed").notNull().default(1),
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }).notNull().defaultNow(),
    lastShipmentId: uuid("last_shipment_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("client_memory_org_supplier_key").on(t.organizationId, t.supplierId, t.productKey)],
);

/* ------------------------------------------------------------------ */
/* Phase 3                                                             */
/* ------------------------------------------------------------------ */
export const trackingEvents = pgTable("tracking_events", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
  source: text("source").notNull().default("manual"),
  createdAt: createdAt(),
});

export const waybillDrafts = pgTable("waybill_drafts", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const counterpartyChecks = pgTable("counterparty_checks", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  subjectType: text("subject_type").notNull(),
  subjectRef: text("subject_ref").notNull(),
  result: jsonb("result").notNull(),
  source: text("source").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});

export const subscriptions = pgTable("subscriptions", {
  id: id(),
  organizationId: uuid("organization_id").notNull().unique().references(() => organizations.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  declarationLimit: integer("declaration_limit"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const usageEvents = pgTable(
  "usage_events",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    quantity: integer("quantity").notNull().default(1),
    refId: text("ref_id"),
    createdAt: createdAt(),
  },
  (t) => [index("usage_org_kind").on(t.organizationId, t.kind, t.createdAt)],
);

export const paymentEvents = pgTable("payment_events", {
  id: id(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull().unique(),
  kind: text("kind").notNull(),
  amountGel: money("amount_gel"),
  payload: jsonb("payload"),
  createdAt: createdAt(),
});

export const countryProfiles = pgTable("country_profiles", {
  id: id(),
  countryCode: text("country_code").notNull().unique(),
  nameKa: text("name_ka").notNull(),
  currency: text("currency").notNull(),
  vatRate: numeric("vat_rate", { precision: 6, scale: 3 }).notNull(),
  vatIncludesExcise: boolean("vat_includes_excise").notNull().default(true),
  feeScheduleRef: text("fee_schedule_ref").notNull(),
  xmlProfile: text("xml_profile").notNull(),
  locale: text("locale").notNull(),
  offices: jsonb("offices").$type<{ code: string; name_ka: string; name_en: string }[]>().notNull().default([]),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const evalResults = pgTable("eval_results", {
  id: id(),
  suite: text("suite").notNull(),
  summary: jsonb("summary").notNull(),
  details: jsonb("details").notNull(),
  createdAt: createdAt(),
});
