CREATE TYPE "public"."display_currency" AS ENUM('CAD', 'USD');--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "display_currency" "display_currency" DEFAULT 'CAD' NOT NULL;