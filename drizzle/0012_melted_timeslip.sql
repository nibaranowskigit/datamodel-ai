CREATE TABLE "proposed_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"field_key" text NOT NULL,
	"label" text NOT NULL,
	"data_type" text NOT NULL,
	"enum_values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text NOT NULL,
	"source_evidence" text NOT NULL,
	"confidence" real NOT NULL,
	"rationale" text NOT NULL,
	"sync_run_id" text,
	"model_type" text DEFAULT 'udm' NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "proposed_fields_org_id_field_key_unique" UNIQUE("org_id","field_key")
);
--> statement-breakpoint
ALTER TABLE "proposed_fields" ADD CONSTRAINT "proposed_fields_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposed_fields" ADD CONSTRAINT "proposed_fields_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE set null ON UPDATE no action;