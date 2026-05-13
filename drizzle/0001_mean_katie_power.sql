CREATE TABLE "news_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"provider_id" text NOT NULL,
	"title" text NOT NULL,
	"link" text NOT NULL,
	"publisher" text,
	"published_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sentiment_cache" (
	"instrument_id" integer NOT NULL,
	"source" text NOT NULL,
	"bull_pct" numeric(5, 2),
	"bear_pct" numeric(5, 2),
	"mentions_24h" integer,
	"sample_size" integer,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sentiment_cache_instrument_id_source_pk" PRIMARY KEY("instrument_id","source")
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"instrument_id" integer NOT NULL,
	"notes" text,
	"graduated" boolean DEFAULT false NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentiment_cache" ADD CONSTRAINT "sentiment_cache_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "news_instrument_provider_uniq" ON "news_items" USING btree ("instrument_id","provider_id");--> statement-breakpoint
CREATE INDEX "news_instrument_published_idx" ON "news_items" USING btree ("instrument_id","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_user_instrument_uniq" ON "watchlist" USING btree ("user_id","instrument_id");