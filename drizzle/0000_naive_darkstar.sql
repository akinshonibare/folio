CREATE TYPE "public"."account_classification" AS ENUM('TFSA', 'RRSP', 'FHSA', 'MARGIN', 'CRYPTO', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."broker" AS ENUM('WEALTHSIMPLE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."option_type" AS ENUM('CALL', 'PUT');--> statement-breakpoint
CREATE TYPE "public"."position_direction" AS ENUM('LONG', 'SHORT');--> statement-breakpoint
CREATE TYPE "public"."quote_provider" AS ENUM('yahoo', 'polygon');--> statement-breakpoint
CREATE TYPE "public"."security_type" AS ENUM('EQUITY', 'EXCHANGE_TRADED_FUND', 'OPTION', 'CRYPTOCURRENCY', 'PRECIOUS_METAL', 'OTHER');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"broker" "broker" DEFAULT 'WEALTHSIMPLE' NOT NULL,
	"name" text NOT NULL,
	"account_type" text NOT NULL,
	"classification" "account_classification" DEFAULT 'OTHER' NOT NULL,
	"account_key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"date" date NOT NULL,
	"base" text NOT NULL,
	"quote" text NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	CONSTRAINT "fx_rates_date_base_quote_pk" PRIMARY KEY("date","base","quote")
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"group_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"invite_code" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" serial PRIMARY KEY NOT NULL,
	"security_type" "security_type" NOT NULL,
	"symbol" text NOT NULL,
	"exchange" text DEFAULT '' NOT NULL,
	"mic" text DEFAULT '' NOT NULL,
	"name" text,
	"option_underlying" text,
	"option_type" "option_type",
	"option_strike" numeric(18, 4),
	"option_expiry" date,
	"option_contract_size" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_quotes" (
	"instrument_id" integer PRIMARY KEY NOT NULL,
	"price" numeric(18, 6) NOT NULL,
	"currency" text NOT NULL,
	"day_change_pct" numeric(10, 4),
	"provider" "quote_provider" NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"account_id" integer NOT NULL,
	"instrument_id" integer NOT NULL,
	"direction" "position_direction" NOT NULL,
	"quantity" numeric(24, 8) NOT NULL,
	"market_price" numeric(18, 6) NOT NULL,
	"market_price_currency" text NOT NULL,
	"book_value_native" numeric(18, 4) NOT NULL,
	"book_value_native_currency" text NOT NULL,
	"book_value_cad" numeric(18, 4) NOT NULL,
	"market_value_native" numeric(18, 4) NOT NULL,
	"market_value_native_currency" text NOT NULL,
	"unrealized_return_native" numeric(18, 4) NOT NULL,
	"unrealized_return_native_currency" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"broker" "broker" DEFAULT 'WEALTHSIMPLE' NOT NULL,
	"csv_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"quote_provider" "quote_provider" DEFAULT 'yahoo' NOT NULL,
	"stealth_default" boolean DEFAULT false NOT NULL,
	"share_dollars_in_groups" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_quotes" ADD CONSTRAINT "live_quotes_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_user_key_uniq" ON "accounts" USING btree ("user_id","account_key_hash");--> statement-breakpoint
CREATE INDEX "group_members_user_idx" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "instruments_symbol_exch_uniq" ON "instruments" USING btree ("symbol","exchange");--> statement-breakpoint
CREATE INDEX "instruments_type_idx" ON "instruments" USING btree ("security_type");--> statement-breakpoint
CREATE INDEX "positions_snapshot_idx" ON "positions" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "positions_user_snapshot_idx" ON "positions" USING btree ("user_id","snapshot_id");--> statement-breakpoint
CREATE INDEX "positions_instrument_idx" ON "positions" USING btree ("instrument_id");--> statement-breakpoint
CREATE UNIQUE INDEX "snapshots_user_hash_uniq" ON "snapshots" USING btree ("user_id","csv_hash");--> statement-breakpoint
CREATE INDEX "snapshots_user_asof_idx" ON "snapshots" USING btree ("user_id","as_of");