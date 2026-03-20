CREATE TYPE "public"."sync_status" AS ENUM('running', 'success', 'error', 'partial');--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"source_type" text NOT NULL,
	"status" "sync_status" NOT NULL,
	"records_upserted" integer DEFAULT 0,
	"fields_updated" integer DEFAULT 0,
	"error_message" text,
	"duration_ms" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;