-- S1.5: Drop old cdm_conflicts stub and replace with production schema.
-- The stub (created in 0003) referenced cdm_records and had different columns.
-- The new table references udm_records and tracks cross-source field disagreements.

ALTER TABLE "cdm_conflicts" DROP CONSTRAINT IF EXISTS "cdm_conflicts_org_id_orgs_id_fk";
--> statement-breakpoint
ALTER TABLE "cdm_conflicts" DROP CONSTRAINT IF EXISTS "cdm_conflicts_record_id_cdm_records_id_fk";
--> statement-breakpoint
DROP TABLE "cdm_conflicts";
--> statement-breakpoint

CREATE TABLE "cdm_conflicts" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"udm_record_id" text NOT NULL,
	"field_key" text NOT NULL,
	"source_type_a" text NOT NULL,
	"value_a" text,
	"source_type_b" text NOT NULL,
	"value_b" text,
	"resolved_at" timestamp,
	"resolved_by" text,
	"resolved_value" text,
	"resolved_source" text,
	"auto_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conflicts_org_record_field_key" UNIQUE("org_id","udm_record_id","field_key")
);
--> statement-breakpoint

CREATE TABLE "reconciliation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"namespace" text NOT NULL,
	"source_type" text NOT NULL,
	"priority" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reconciliation_rules_org_id_namespace_source_type_unique" UNIQUE("org_id","namespace","source_type")
);
--> statement-breakpoint

ALTER TABLE "cdm_conflicts" ADD CONSTRAINT "cdm_conflicts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cdm_conflicts" ADD CONSTRAINT "cdm_conflicts_udm_record_id_udm_records_id_fk" FOREIGN KEY ("udm_record_id") REFERENCES "public"."udm_records"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reconciliation_rules" ADD CONSTRAINT "reconciliation_rules_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "conflicts_org_unresolved_idx" ON "cdm_conflicts" ("org_id","resolved_at");
--> statement-breakpoint
CREATE INDEX "conflicts_udm_record_idx" ON "cdm_conflicts" ("udm_record_id");
