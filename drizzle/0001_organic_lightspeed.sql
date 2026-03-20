CREATE TYPE "public"."conflict_rule" AS ENUM('master_wins', 'latest_wins', 'sum', 'manual');--> statement-breakpoint
CREATE TYPE "public"."field_data_type" AS ENUM('string', 'number', 'boolean', 'date', 'json', 'array');--> statement-breakpoint
CREATE TYPE "public"."field_status" AS ENUM('proposed', 'approved', 'in_development', 'staging', 'production', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."field_typology" AS ENUM('GEN', 'FIN', 'PROD', 'SUP', 'SALES', 'COMP', 'AI');--> statement-breakpoint
CREATE TYPE "public"."source_direction" AS ENUM('read', 'write');--> statement-breakpoint
CREATE TABLE "udm_field_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"field_id" text NOT NULL,
	"org_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_field_path" text NOT NULL,
	"direction" "source_direction" DEFAULT 'read' NOT NULL,
	"is_master" boolean DEFAULT false NOT NULL,
	"conflict_rule" "conflict_rule" DEFAULT 'master_wins' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "udm_field_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"field_id" text NOT NULL,
	"org_id" text NOT NULL,
	"version" integer NOT NULL,
	"schema_snapshot" jsonb NOT NULL,
	"change_description" text,
	"changed_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "udm_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"field_key" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"typology" "field_typology" NOT NULL,
	"data_type" "field_data_type" NOT NULL,
	"status" "field_status" DEFAULT 'proposed' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"ai_suggested" boolean DEFAULT false NOT NULL,
	"ai_rationale" text,
	"approved_by" text,
	"approved_at" timestamp,
	"superseded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "udm_fields_org_id_field_key_unique" UNIQUE("org_id","field_key")
);
--> statement-breakpoint
ALTER TABLE "udm_field_sources" ADD CONSTRAINT "udm_field_sources_field_id_udm_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."udm_fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "udm_field_sources" ADD CONSTRAINT "udm_field_sources_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "udm_field_versions" ADD CONSTRAINT "udm_field_versions_field_id_udm_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."udm_fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "udm_field_versions" ADD CONSTRAINT "udm_field_versions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "udm_fields" ADD CONSTRAINT "udm_fields_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;