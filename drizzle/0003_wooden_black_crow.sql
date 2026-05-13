CREATE TABLE "ai_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_cache_kind_key_uniq" ON "ai_cache" USING btree ("kind","key");