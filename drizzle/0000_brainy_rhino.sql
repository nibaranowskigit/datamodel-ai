CREATE TYPE "public"."business_type" AS ENUM('b2b', 'b2c');--> statement-breakpoint
CREATE TYPE "public"."org_plan" AS ENUM('free', 'starter', 'growth');--> statement-breakpoint
CREATE TYPE "public"."org_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"business_type" "business_type",
	"vertical" text,
	"stage" text,
	"plan" "org_plan" DEFAULT 'free' NOT NULL,
	"status" "org_status" DEFAULT 'active' NOT NULL,
	"clerk_org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orgs_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
