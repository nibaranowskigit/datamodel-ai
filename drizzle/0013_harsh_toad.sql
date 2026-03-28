ALTER TABLE "proposed_fields" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "proposed_fields" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "proposed_fields" ADD COLUMN "rejected_by" text;--> statement-breakpoint
ALTER TABLE "proposed_fields" ADD COLUMN "rejected_at" timestamp;