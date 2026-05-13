CREATE TABLE "earnings_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"date" date NOT NULL,
	"kind" text NOT NULL,
	"eps_actual" numeric(12, 4),
	"eps_estimate" numeric(12, 4),
	"quarter" integer,
	"year" integer,
	"hour" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insider_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"insider_name" text NOT NULL,
	"filing_date" date NOT NULL,
	"transaction_date" date NOT NULL,
	"shares" numeric(18, 4) NOT NULL,
	"change" numeric(18, 4) NOT NULL,
	"price" numeric(18, 4) NOT NULL,
	"code" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "earnings_events_uniq" ON "earnings_events" USING btree ("symbol","date","kind");--> statement-breakpoint
CREATE INDEX "earnings_events_date_idx" ON "earnings_events" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "insider_transactions_uniq" ON "insider_transactions" USING btree ("symbol","filing_date","insider_name","transaction_date","shares");--> statement-breakpoint
CREATE INDEX "insider_transactions_symbol_idx" ON "insider_transactions" USING btree ("symbol");