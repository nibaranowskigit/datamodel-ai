CREATE TYPE "public"."source_status" AS ENUM('pending', 'active', 'error', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('hubspot', 'stripe', 'intercom', 'mixpanel', 'salesforce', 'vitally', 'amplitude', 'posthog', 'bigquery', 'snowflake');--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"source_type" "source_type" NOT NULL,
	"display_name" text NOT NULL,
	"connection_config" text,
	"status" "source_status" DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp,
	"last_sync_error" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "data_sources_org_id_source_type_unique" UNIQUE("org_id","source_type")
);
--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;