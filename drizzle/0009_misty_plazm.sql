CREATE TABLE "sync_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"sources_total" integer DEFAULT 0 NOT NULL,
	"sources_success" integer DEFAULT 0 NOT NULL,
	"sources_failed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sync_logs" ADD COLUMN "sync_run_id" text;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sync_runs_org_idx" ON "sync_runs" USING btree ("org_id");--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE no action ON UPDATE no action;