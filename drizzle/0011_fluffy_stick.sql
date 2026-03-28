CREATE TABLE "identity_matches" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"primary_record_id" text NOT NULL,
	"alias_record_id" text NOT NULL,
	"match_rule" text NOT NULL,
	"confidence" real NOT NULL,
	"auto_merged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "identity_matches_org_primary_alias_unique" UNIQUE("org_id","primary_record_id","alias_record_id")
);
--> statement-breakpoint
CREATE TABLE "identity_review_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"record_id_a" text NOT NULL,
	"record_id_b" text NOT NULL,
	"match_rule" text NOT NULL,
	"confidence" real NOT NULL,
	"evidence_a" text,
	"evidence_b" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp,
	"suppressed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "identity_review_queue_org_pair_unique" UNIQUE("org_id","record_id_a","record_id_b")
);
--> statement-breakpoint
ALTER TABLE "udm_records" ADD COLUMN "alias_of_id" text;--> statement-breakpoint
ALTER TABLE "identity_matches" ADD CONSTRAINT "identity_matches_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_review_queue" ADD CONSTRAINT "identity_review_queue_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "identity_primary_idx" ON "identity_matches" USING btree ("org_id","primary_record_id");--> statement-breakpoint
CREATE INDEX "identity_alias_idx" ON "identity_matches" USING btree ("org_id","alias_record_id");--> statement-breakpoint
CREATE INDEX "identity_queue_org_status_idx" ON "identity_review_queue" USING btree ("org_id","status");--> statement-breakpoint
ALTER TABLE "udm_records" ADD CONSTRAINT "udm_records_alias_of_id_udm_records_id_fk" FOREIGN KEY ("alias_of_id") REFERENCES "public"."udm_records"("id") ON DELETE no action ON UPDATE no action;