import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  date,
  uniqueIndex,
  index,
  primaryKey,
  serial,
} from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────────────────────────────────

export const securityTypeEnum = pgEnum("security_type", [
  "EQUITY",
  "EXCHANGE_TRADED_FUND",
  "OPTION",
  "CRYPTOCURRENCY",
  "PRECIOUS_METAL",
  "OTHER",
]);

export const positionDirectionEnum = pgEnum("position_direction", [
  "LONG",
  "SHORT",
]);

export const optionTypeEnum = pgEnum("option_type", ["CALL", "PUT"]);

export const accountClassificationEnum = pgEnum("account_classification", [
  "TFSA",
  "RRSP",
  "FHSA",
  "MARGIN",
  "CRYPTO",
  "OTHER",
]);

export const brokerEnum = pgEnum("broker", ["WEALTHSIMPLE", "OTHER"]);

export const quoteProviderEnum = pgEnum("quote_provider", [
  "yahoo",
  "polygon",
]);

// ──────────────────────────────────────────────────────────────────────────
// Users (Clerk subject is the PK)
// ──────────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  // Clerk user id (e.g. "user_2abc...").
  id: text("id").primaryKey(),
  email: text("email"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // Yahoo by default. Polygon only honoured if POLYGON_API_KEY env var is set.
  quoteProvider: quoteProviderEnum("quote_provider").notNull().default("yahoo"),
  // Stealth mode: globally mask $ amounts in this user's own dashboard.
  stealthDefault: boolean("stealth_default").notNull().default(false),
  // For group views — whether to show dollar amounts to group members (default off:
  // groups see tickers + quantities but not $).
  shareDollarsInGroups: boolean("share_dollars_in_groups")
    .notNull()
    .default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ──────────────────────────────────────────────────────────────────────────
// Friend groups
// ──────────────────────────────────────────────────────────────────────────

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // 6-char human-friendly invite code.
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // 'owner' | 'member'
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.groupId, t.userId] }),
    idxUser: index("group_members_user_idx").on(t.userId),
  }),
);

// ──────────────────────────────────────────────────────────────────────────
// Brokerage accounts (one row per user × account in their broker)
// ──────────────────────────────────────────────────────────────────────────

export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    broker: brokerEnum("broker").notNull().default("WEALTHSIMPLE"),
    // Display name from CSV (e.g. "Highway", "RRSP", "TFSA"). PII-ish account
    // numbers are NOT stored — we hash and use only as a stable key.
    name: text("name").notNull(),
    accountType: text("account_type").notNull(),
    classification: accountClassificationEnum("classification")
      .notNull()
      .default("OTHER"),
    // SHA-256 of the raw account number; used to recognise the same account
    // across uploads without ever persisting the cleartext.
    accountKeyHash: text("account_key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqUserKey: uniqueIndex("accounts_user_key_uniq").on(
      t.userId,
      t.accountKeyHash,
    ),
  }),
);

// ──────────────────────────────────────────────────────────────────────────
// Instruments — global, shared across users (no user_id). Caches data that's
// the same for everyone (e.g. Apple's name, NVDA's sector, an option's strike).
// ──────────────────────────────────────────────────────────────────────────

export const instruments = pgTable(
  "instruments",
  {
    id: serial("id").primaryKey(),
    securityType: securityTypeEnum("security_type").notNull(),
    // For equities/ETFs: ticker symbol. For options: the OCC symbol (full
    // 21-char string). For crypto: the coin symbol (e.g. "BTC"). Always uppercase.
    symbol: text("symbol").notNull(),
    // For equities/ETFs only. Empty string for crypto/options.
    exchange: text("exchange").notNull().default(""),
    mic: text("mic").notNull().default(""),
    name: text("name"),
    // Option-specific fields (null for non-options).
    optionUnderlying: text("option_underlying"),
    optionType: optionTypeEnum("option_type"),
    optionStrike: numeric("option_strike", { precision: 18, scale: 4 }),
    optionExpiry: date("option_expiry"),
    optionContractSize: integer("option_contract_size"), // usually 100
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // (symbol, exchange) is the right key for equities/ETFs (UNH-NYSE vs UNH-TSX
    // CDR are different instruments). For options the symbol IS the OCC string
    // which is globally unique, and exchange goes blank — same uniq constraint
    // still works.
    uniqSymbolExch: uniqueIndex("instruments_symbol_exch_uniq").on(
      t.symbol,
      t.exchange,
    ),
    idxType: index("instruments_type_idx").on(t.securityType),
  }),
);

// ──────────────────────────────────────────────────────────────────────────
// Snapshots — every CSV upload becomes a new row.
// ──────────────────────────────────────────────────────────────────────────

export const snapshots = pgTable(
  "snapshots",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // As-of timestamp parsed from the CSV trailer ("As of 2026-05-12 21:39 ...").
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    broker: brokerEnum("broker").notNull().default("WEALTHSIMPLE"),
    // SHA-256 of the raw CSV bytes; used to detect duplicate uploads.
    csvHash: text("csv_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqUserHash: uniqueIndex("snapshots_user_hash_uniq").on(
      t.userId,
      t.csvHash,
    ),
    idxUserAsOf: index("snapshots_user_asof_idx").on(t.userId, t.asOf),
  }),
);

// ──────────────────────────────────────────────────────────────────────────
// Positions — one row per (snapshot × account × instrument).
// ──────────────────────────────────────────────────────────────────────────

export const positions = pgTable(
  "positions",
  {
    id: serial("id").primaryKey(),
    snapshotId: integer("snapshot_id")
      .notNull()
      .references(() => snapshots.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "restrict" }),
    direction: positionDirectionEnum("direction").notNull(),
    quantity: numeric("quantity", { precision: 24, scale: 8 }).notNull(),
    // Market price as reported by broker, in native currency.
    marketPrice: numeric("market_price", {
      precision: 18,
      scale: 6,
    }).notNull(),
    marketPriceCurrency: text("market_price_currency").notNull(),
    // Cost basis as reported by broker, native currency.
    bookValueNative: numeric("book_value_native", {
      precision: 18,
      scale: 4,
    }).notNull(),
    bookValueNativeCurrency: text("book_value_native_currency").notNull(),
    // Cost basis converted to CAD by broker (already in CSV; trust it).
    bookValueCad: numeric("book_value_cad", {
      precision: 18,
      scale: 4,
    }).notNull(),
    marketValueNative: numeric("market_value_native", {
      precision: 18,
      scale: 4,
    }).notNull(),
    marketValueNativeCurrency: text("market_value_native_currency").notNull(),
    unrealizedReturnNative: numeric("unrealized_return_native", {
      precision: 18,
      scale: 4,
    }).notNull(),
    unrealizedReturnNativeCurrency: text(
      "unrealized_return_native_currency",
    ).notNull(),
  },
  (t) => ({
    idxSnap: index("positions_snapshot_idx").on(t.snapshotId),
    idxUserSnap: index("positions_user_snapshot_idx").on(
      t.userId,
      t.snapshotId,
    ),
    idxInstr: index("positions_instrument_idx").on(t.instrumentId),
  }),
);

// ──────────────────────────────────────────────────────────────────────────
// Live quote cache — shared across users, keyed on instrument.
// ──────────────────────────────────────────────────────────────────────────

export const liveQuotes = pgTable(
  "live_quotes",
  {
    instrumentId: integer("instrument_id")
      .primaryKey()
      .references(() => instruments.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 18, scale: 6 }).notNull(),
    currency: text("currency").notNull(),
    dayChangePct: numeric("day_change_pct", { precision: 10, scale: 4 }),
    provider: quoteProviderEnum("provider").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

// ──────────────────────────────────────────────────────────────────────────
// FX rate cache — keyed on (date, base→quote).
// ──────────────────────────────────────────────────────────────────────────

export const fxRates = pgTable(
  "fx_rates",
  {
    date: date("date").notNull(),
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.date, t.base, t.quote] }),
  }),
);
