CREATE TYPE "public"."ecustoms_access_status" AS ENUM('none', 'applied', 'active', 'expired');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('user', 'ai', 'system');--> statement-breakpoint
CREATE TYPE "public"."ai_purpose" AS ENUM('extract', 'classify', 'explain');--> statement-breakpoint
CREATE TYPE "public"."checklist_kind" AS ENUM('documents', 'yellow_corridor', 'red_corridor_physical', 'red_corridor_value', 'ecustoms_access', 'ecustoms_import', 'payment');--> statement-breakpoint
CREATE TYPE "public"."corridor" AS ENUM('green', 'blue', 'yellow', 'red');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('invoice', 'packing_list', 'cmr', 'bl', 'awb', 'eur1', 'ct1', 'form_a', 'phyto', 'vet', 'license', 'sad_xml_sample', 'other');--> statement-breakpoint
CREATE TYPE "public"."document_source" AS ENUM('upload', 'email', 'telegram', 'viber');--> statement-breakpoint
CREATE TYPE "public"."export_kind" AS ENUM('sad_xml', 'sheet_pdf', 'xls', 'evidence_zip');--> statement-breakpoint
CREATE TYPE "public"."fee_mode" AS ENUM('pre_arrival_self', 'pre_arrival_rs_staff_electronic', 'pre_arrival_rs_staff_paper', 'post_arrival_self', 'post_arrival_rs_staff');--> statement-breakpoint
CREATE TYPE "public"."fx_source" AS ENUM('manual', 'nbg');--> statement-breakpoint
CREATE TYPE "public"."hs_source" AS ENUM('ai', 'client_memory', 'manual');--> statement-breakpoint
CREATE TYPE "public"."intake_kind" AS ENUM('email', 'telegram', 'viber');--> statement-breakpoint
CREATE TYPE "public"."intake_status" AS ENUM('received', 'attached', 'ignored', 'error');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."price_ref_source" AS ENUM('own_history', 'user_reference');--> statement-breakpoint
CREATE TYPE "public"."red_reason" AS ENUM('physical', 'value', 'documents', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('draft', 'extracting', 'review_lines', 'classifying', 'calculating', 'awaiting_approval', 'approved', 'exported', 'imported_to_ecustoms', 'assessed', 'paid', 'corridor_green', 'corridor_blue', 'corridor_yellow', 'corridor_red', 'released', 'closed', 'cancelled');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"shipment_id" uuid,
	"purpose" "ai_purpose" NOT NULL,
	"model" text NOT NULL,
	"prompt_hash" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"cost_usd" numeric(10, 6),
	"output" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" text,
	"entity" text NOT NULL,
	"entity_id" text,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"customs_value_gel" numeric(14, 2) NOT NULL,
	"breakdown" jsonb NOT NULL,
	"duty_total" numeric(14, 2) NOT NULL,
	"excise_total" numeric(14, 2) NOT NULL,
	"vat_total" numeric(14, 2) NOT NULL,
	"fee_gel" numeric(14, 2) NOT NULL,
	"fee_mode" "fee_mode" NOT NULL,
	"fee_off_hours" boolean DEFAULT false NOT NULL,
	"fee_alternatives" jsonb NOT NULL,
	"broker_cost_comparison_gel" numeric(14, 2) NOT NULL,
	"penalty_exposure_total_gel" numeric(14, 2) NOT NULL,
	"value_risk_level" text DEFAULT 'none' NOT NULL,
	"total_payable_gel" numeric(14, 2) NOT NULL,
	"fx_rate" numeric(14, 6) NOT NULL,
	"fx_currency" text NOT NULL,
	"fx_date" date NOT NULL,
	"fx_source" text NOT NULL,
	"vat_rate" numeric(6, 3) NOT NULL,
	"tariff_version_id" uuid NOT NULL,
	"fee_schedule_effective_from" date NOT NULL,
	"fx_rate_id" uuid,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shipment_id" uuid,
	"kind" "checklist_kind" NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"supplier_id" uuid,
	"product_key" text NOT NULL,
	"description_raw" text,
	"hs_code" text NOT NULL,
	"times_confirmed" integer DEFAULT 1 NOT NULL,
	"last_confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_shipment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counterparty_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"subject_ref" text NOT NULL,
	"result" jsonb NOT NULL,
	"source" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "country_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" text NOT NULL,
	"name_ka" text NOT NULL,
	"currency" text NOT NULL,
	"vat_rate" numeric(6, 3) NOT NULL,
	"vat_includes_excise" boolean DEFAULT true NOT NULL,
	"fee_schedule_ref" text NOT NULL,
	"xml_profile" text NOT NULL,
	"locale" text NOT NULL,
	"offices" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "country_profiles_country_code_unique" UNIQUE("country_code")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shipment_id" uuid,
	"kind" "document_kind" NOT NULL,
	"file_name" text NOT NULL,
	"blob_url" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"pages" integer,
	"source" "document_source" DEFAULT 'upload' NOT NULL,
	"sha256" text NOT NULL,
	"extraction_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ecustoms_access_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" text DEFAULT 'GE' NOT NULL,
	"term_months" integer NOT NULL,
	"fee_gel" numeric(14, 2) NOT NULL,
	"legal_ref" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ecustoms_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"access_status" "ecustoms_access_status" DEFAULT 'none' NOT NULL,
	"access_valid_until" date,
	"access_term_months" integer,
	"employee_name" text,
	"employee_in_register" boolean DEFAULT false NOT NULL,
	"no_fee_debt_confirmed" boolean DEFAULT false NOT NULL,
	"customs_office_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"application_submitted_at" timestamp with time zone,
	"empty_sad_sample_document_id" uuid,
	"wizard_step" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ecustoms_profiles_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "eval_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"suite" text NOT NULL,
	"summary" jsonb NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"calculation_id" uuid NOT NULL,
	"kind" "export_kind" NOT NULL,
	"blob_url" text NOT NULL,
	"file_name" text NOT NULL,
	"xml_profile_version" text,
	"validated_against_real_sample" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" text DEFAULT 'GE' NOT NULL,
	"effective_from" date NOT NULL,
	"mode" "fee_mode" NOT NULL,
	"value_min" numeric(14, 2) NOT NULL,
	"value_max" numeric(14, 2),
	"fee_gel" numeric(14, 2) NOT NULL,
	"doubles_off_hours" boolean DEFAULT false NOT NULL,
	"legal_ref" text NOT NULL,
	"needs_reverification" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"currency" text NOT NULL,
	"date" date NOT NULL,
	"rate_gel" numeric(14, 6) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"source" "fx_source" NOT NULL,
	"note" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" text DEFAULT 'GE' NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"needs_reverification" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hs_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invoice_line_id" uuid NOT NULL,
	"candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"questions_for_user" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_hs_code" text,
	"suggested_confidence" numeric(4, 3),
	"source" "hs_source" DEFAULT 'ai' NOT NULL,
	"memory_times_confirmed" integer,
	"final_hs_code" text,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"override_reason" text,
	"penalty_exposure_gel" numeric(14, 2),
	"advance_ruling_recommended" boolean DEFAULT false NOT NULL,
	"value_risk" jsonb,
	"tariff_version_id" uuid,
	"ai_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hs_decisions_invoice_line_id_unique" UNIQUE("invoice_line_id")
);
--> statement-breakpoint
CREATE TABLE "intake_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "intake_kind" NOT NULL,
	"address_or_chat_id" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"secret" text NOT NULL,
	"allowlist" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"channel_id" uuid,
	"kind" "intake_kind" NOT NULL,
	"external_id" text NOT NULL,
	"from_address" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_meta" jsonb,
	"shipment_id" uuid,
	"status" "intake_status" DEFAULT 'received' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "membership_role" DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"description_raw" text NOT NULL,
	"description_normalized_ka" text,
	"sku" text,
	"quantity" numeric(14, 3) NOT NULL,
	"unit" text,
	"unit_price" numeric(14, 4) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL,
	"currency" text NOT NULL,
	"origin_country" text,
	"net_weight_kg" numeric(14, 3),
	"gross_weight_kg" numeric(14, 3),
	"extraction_confidence" numeric(4, 3),
	"source_bbox" jsonb,
	"edited_by_human" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"tax_id" text,
	"legal_form" text,
	"address" text,
	"default_currency" text DEFAULT 'USD' NOT NULL,
	"locale" text DEFAULT 'ka' NOT NULL,
	"country_code" text DEFAULT 'GE' NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"is_natural_person" boolean DEFAULT false NOT NULL,
	"broker_cost_per_hs_gel" numeric(14, 2) DEFAULT '100.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"kind" text NOT NULL,
	"amount_gel" numeric(14, 2),
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_events_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "penalty_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" text DEFAULT 'GE' NOT NULL,
	"rule" text NOT NULL,
	"percent" numeric(6, 2) NOT NULL,
	"threshold_gel" numeric(14, 2),
	"legal_ref" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"hs_code" text NOT NULL,
	"origin_country" text,
	"unit_basis" text NOT NULL,
	"unit_price_gel" numeric(14, 4) NOT NULL,
	"observed_at" date NOT NULL,
	"source" "price_ref_source" NOT NULL,
	"shipment_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rs_service_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" text DEFAULT 'GE' NOT NULL,
	"key" text NOT NULL,
	"label_ka" text NOT NULL,
	"fee_gel" numeric(14, 2) NOT NULL,
	"days_or_unit" text,
	"legal_ref" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"supplier_id" uuid,
	"reference" text NOT NULL,
	"status" "shipment_status" DEFAULT 'draft' NOT NULL,
	"mode" "fee_mode" DEFAULT 'pre_arrival_self' NOT NULL,
	"incoterm" text,
	"incoterm_place" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"invoice_number" text,
	"invoice_date" date,
	"invoice_total" numeric(14, 2),
	"freight_amount" numeric(14, 2),
	"freight_currency" text,
	"insurance_amount" numeric(14, 2),
	"insurance_currency" text,
	"other_costs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allocation_basis" text DEFAULT 'value' NOT NULL,
	"origin_country" text,
	"dispatch_country" text,
	"transport_mode" text,
	"transport_doc_no" text,
	"border_post" text,
	"destination_office" text,
	"expected_arrival_date" date,
	"gross_weight_kg" numeric(14, 3),
	"net_weight_kg" numeric(14, 3),
	"packages" integer,
	"assessment_number" text,
	"corridor" "corridor",
	"red_reason" "red_reason",
	"rs_adjusted_value_gel" numeric(14, 2),
	"fx_rate_id" uuid,
	"declaration_registration_date" date,
	"fx_rate_date_rule" text DEFAULT 'registration_date' NOT NULL,
	"goods_already_arrived" boolean DEFAULT false NOT NULL,
	"supplier_name_raw" text,
	"buyer_name_raw" text,
	"released_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"period_start" date,
	"period_end" date,
	"declaration_limit" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"address" text,
	"tax_id" text,
	"default_incoterm" text,
	"default_currency" text,
	"default_origin_country" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tariff_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tariff_version_id" uuid NOT NULL,
	"hs_code" text NOT NULL,
	"description_ka" text NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"chapter_notes" text,
	"heading_notes" text,
	"duty_rate" numeric(7, 3) DEFAULT '0' NOT NULL,
	"duty_specific" jsonb,
	"excise_rate" numeric(7, 3),
	"excise_specific" jsonb,
	"vat_exempt" boolean DEFAULT false NOT NULL,
	"requires_docs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unit" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(hs_code,'') || ' ' || coalesce(description_ka,'') || ' ' || coalesce(description_en,'') || ' ' || coalesce(heading_notes,''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tariff_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" text DEFAULT 'GE' NOT NULL,
	"source" text NOT NULL,
	"effective_from" date NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_placeholder" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"checksum" text NOT NULL,
	"line_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"ref_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"is_superadmin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "waybill_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "working_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" text DEFAULT 'GE' NOT NULL,
	"office_code" text,
	"weekday" integer NOT NULL,
	"opens_at" text,
	"closes_at" text,
	"legal_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_tariff_version_id_tariff_versions_id_fk" FOREIGN KEY ("tariff_version_id") REFERENCES "public"."tariff_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_fx_rate_id_fx_rates_id_fk" FOREIGN KEY ("fx_rate_id") REFERENCES "public"."fx_rates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_memory" ADD CONSTRAINT "client_memory_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_memory" ADD CONSTRAINT "client_memory_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counterparty_checks" ADD CONSTRAINT "counterparty_checks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ecustoms_profiles" ADD CONSTRAINT "ecustoms_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_calculation_id_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."calculations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hs_decisions" ADD CONSTRAINT "hs_decisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hs_decisions" ADD CONSTRAINT "hs_decisions_invoice_line_id_invoice_lines_id_fk" FOREIGN KEY ("invoice_line_id") REFERENCES "public"."invoice_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hs_decisions" ADD CONSTRAINT "hs_decisions_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hs_decisions" ADD CONSTRAINT "hs_decisions_tariff_version_id_tariff_versions_id_fk" FOREIGN KEY ("tariff_version_id") REFERENCES "public"."tariff_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_channels" ADD CONSTRAINT "intake_channels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_messages" ADD CONSTRAINT "intake_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_messages" ADD CONSTRAINT "intake_messages_channel_id_intake_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."intake_channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_messages" ADD CONSTRAINT "intake_messages_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_references" ADD CONSTRAINT "price_references_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_fx_rate_id_fx_rates_id_fk" FOREIGN KEY ("fx_rate_id") REFERENCES "public"."fx_rates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_lines" ADD CONSTRAINT "tariff_lines_tariff_version_id_tariff_versions_id_fk" FOREIGN KEY ("tariff_version_id") REFERENCES "public"."tariff_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waybill_drafts" ADD CONSTRAINT "waybill_drafts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waybill_drafts" ADD CONSTRAINT "waybill_drafts_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_org_created" ON "audit_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "calculations_shipment" ON "calculations" USING btree ("shipment_id","version");--> statement-breakpoint
CREATE INDEX "checklists_shipment_kind" ON "checklists" USING btree ("shipment_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "client_memory_org_supplier_key" ON "client_memory" USING btree ("organization_id","supplier_id","product_key");--> statement-breakpoint
CREATE INDEX "documents_org_shipment" ON "documents" USING btree ("organization_id","shipment_id");--> statement-breakpoint
CREATE INDEX "exports_shipment" ON "exports" USING btree ("shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fx_rates_currency_date_source" ON "fx_rates" USING btree ("currency","date","source");--> statement-breakpoint
CREATE INDEX "hs_decisions_org" ON "hs_decisions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intake_kind_address" ON "intake_channels" USING btree ("kind","address_or_chat_id");--> statement-breakpoint
CREATE INDEX "invoice_lines_shipment" ON "invoice_lines" USING btree ("shipment_id","line_no");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user" ON "memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "price_refs_org_hs" ON "price_references" USING btree ("organization_id","hs_code","observed_at");--> statement-breakpoint
CREATE INDEX "shipments_org" ON "shipments" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "suppliers_org" ON "suppliers" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tariff_lines_version_code" ON "tariff_lines" USING btree ("tariff_version_id","hs_code");--> statement-breakpoint
CREATE INDEX "tariff_lines_search" ON "tariff_lines" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "usage_org_kind" ON "usage_events" USING btree ("organization_id","kind","created_at");