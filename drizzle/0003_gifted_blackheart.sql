CREATE TABLE "cdm_conflicts" (
	"id" text PRIMARY KEY NOT NULL,
	"record_id" text NOT NULL,
	"org_id" text NOT NULL,
	"field_key" text NOT NULL,
	"source_a" text NOT NULL,
	"value_a" jsonb,
	"source_b" text NOT NULL,
	"value_b" jsonb,
	"resolution" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdm_field_values" (
	"id" text PRIMARY KEY NOT NULL,
	"record_id" text NOT NULL,
	"org_id" text NOT NULL,
	"field_key" text NOT NULL,
	"value" jsonb,
	"source_type" text NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"previous_value" jsonb,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cdm_field_values_record_id_field_key_unique" UNIQUE("record_id","field_key")
);
--> statement-breakpoint
CREATE TABLE "cdm_records" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"external_company_id" text NOT NULL,
	"domain" text,
	"name" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fill_rate" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cdm_records_org_id_external_company_id_unique" UNIQUE("org_id","external_company_id")
);
--> statement-breakpoint
CREATE TABLE "udm_field_values" (
	"id" text PRIMARY KEY NOT NULL,
	"record_id" text NOT NULL,
	"org_id" text NOT NULL,
	"field_key" text NOT NULL,
	"value" jsonb,
	"source_type" text NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"previous_value" jsonb,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "udm_field_values_record_id_field_key_unique" UNIQUE("record_id","field_key")
);
--> statement-breakpoint
CREATE TABLE "udm_records" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"external_user_id" text NOT NULL,
	"email" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fill_rate" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "udm_records_org_id_external_user_id_unique" UNIQUE("org_id","external_user_id")
);
--> statement-breakpoint
ALTER TABLE "cdm_conflicts" ADD CONSTRAINT "cdm_conflicts_record_id_cdm_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."cdm_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdm_conflicts" ADD CONSTRAINT "cdm_conflicts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdm_field_values" ADD CONSTRAINT "cdm_field_values_record_id_cdm_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."cdm_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdm_field_values" ADD CONSTRAINT "cdm_field_values_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdm_records" ADD CONSTRAINT "cdm_records_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "udm_field_values" ADD CONSTRAINT "udm_field_values_record_id_udm_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."udm_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "udm_field_values" ADD CONSTRAINT "udm_field_values_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "udm_records" ADD CONSTRAINT "udm_records_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;