import Papa from "papaparse";
import { createHash } from "node:crypto";
import { parseOccSymbol, formatOptionName, type OccParsed } from "../options/occ";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export type RawRow = Record<string, string>;

export type ParsedAccount = {
  name: string;
  accountType: string;
  classification:
    | "TFSA"
    | "RRSP"
    | "FHSA"
    | "MARGIN"
    | "CRYPTO"
    | "OTHER";
  accountKeyHash: string; // sha256 of raw account number, never the cleartext
};

export type ParsedInstrument = {
  securityType:
    | "EQUITY"
    | "EXCHANGE_TRADED_FUND"
    | "OPTION"
    | "CRYPTOCURRENCY"
    | "PRECIOUS_METAL"
    | "OTHER";
  symbol: string; // for options: full OCC symbol; otherwise the ticker
  exchange: string; // blank for crypto + options
  mic: string;
  name: string | null;
  option: OccParsed | null;
};

export type ParsedPosition = {
  account: ParsedAccount;
  instrument: ParsedInstrument;
  direction: "LONG" | "SHORT";
  quantity: string; // keep as string to avoid float drift; convert at DB layer
  marketPrice: string;
  marketPriceCurrency: string;
  bookValueNative: string;
  bookValueNativeCurrency: string;
  bookValueCad: string;
  marketValueNative: string;
  marketValueNativeCurrency: string;
  unrealizedReturnNative: string;
  unrealizedReturnNativeCurrency: string;
};

export type ParsedCsv = {
  asOf: Date;
  csvHash: string;
  positions: ParsedPosition[];
};

// ──────────────────────────────────────────────────────────────────────────
// Parser
// ──────────────────────────────────────────────────────────────────────────

const AS_OF_RE = /As of (\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+GMT([+-]\d{2}:\d{2})/;

export function parseWealthsimpleCsv(text: string): ParsedCsv {
  const csvHash = createHash("sha256").update(text).digest("hex");

  // The file has a trailing "As of YYYY-MM-DD HH:MM GMT±HH:MM" line. Papaparse
  // tolerates ragged rows so we feed it the whole file and pull the trailer
  // out separately.
  const asOfLine = text
    .split(/\r?\n/)
    .reverse()
    .find((line) => /As of \d{4}-\d{2}-\d{2}/.test(line));
  if (!asOfLine) {
    throw new Error("CSV missing trailing 'As of ...' line — is this a Wealthsimple holdings export?");
  }
  const m = asOfLine.match(AS_OF_RE);
  if (!m) {
    throw new Error(`CSV 'As of' line not parseable: ${asOfLine}`);
  }
  const [, date, time, tz] = m;
  const asOf = new Date(`${date}T${time}:00${tz}`);

  const parsed = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const positions: ParsedPosition[] = [];
  for (const row of parsed.data) {
    // Skip the trailing "As of ..." row that Papa surfaces as a single-column row.
    if (!row["Symbol"] && !row["Quantity"]) continue;
    if (Object.keys(row).length <= 1) continue;
    const symbolRaw = (row["Symbol"] || "").trim();
    if (!symbolRaw) continue;

    const account = parseAccount(row);
    const instrument = parseInstrument(row, symbolRaw);
    positions.push({
      account,
      instrument,
      direction:
        (row["Position Direction"] || "LONG").toUpperCase() === "SHORT"
          ? "SHORT"
          : "LONG",
      quantity: row["Quantity"] || "0",
      marketPrice: row["Market Price"] || "0",
      marketPriceCurrency: (row["Market Price Currency"] || "USD").trim(),
      bookValueNative: row["Book Value (Market)"] || "0",
      bookValueNativeCurrency: (row["Book Value Currency (Market)"] || "USD").trim(),
      bookValueCad: row["Book Value (CAD)"] || "0",
      marketValueNative: row["Market Value"] || "0",
      marketValueNativeCurrency: (row["Market Value Currency"] || "USD").trim(),
      unrealizedReturnNative: row["Market Unrealized Returns"] || "0",
      unrealizedReturnNativeCurrency: (
        row["Market Unrealized Returns Currency"] || "USD"
      ).trim(),
    });
  }

  return { asOf, csvHash, positions };
}

function parseAccount(row: RawRow): ParsedAccount {
  const rawNumber = (row["Account Number"] || "").trim();
  const accountKeyHash = createHash("sha256").update(rawNumber).digest("hex");
  const name = (row["Account Name"] || "").trim() || "Unknown";
  const accountType = (row["Account Type"] || "").trim() || name;
  return {
    name,
    accountType,
    classification: classifyAccount(accountType, name),
    accountKeyHash,
  };
}

function classifyAccount(
  accountType: string,
  name: string,
): ParsedAccount["classification"] {
  const s = `${accountType} ${name}`.toUpperCase();
  if (s.includes("TFSA")) return "TFSA";
  if (s.includes("RRSP")) return "RRSP";
  if (s.includes("FHSA")) return "FHSA";
  if (s.includes("CRYPTO")) return "CRYPTO";
  if (s.includes("MARGIN") || s.includes("NON-REGISTERED")) return "MARGIN";
  return "OTHER";
}

function parseInstrument(
  row: RawRow,
  symbolRaw: string,
): ParsedInstrument {
  const securityType = (row["Security Type"] || "OTHER").trim().toUpperCase();
  const exchange = (row["Exchange"] || "").trim();
  const mic = (row["MIC"] || "").trim();
  const name = (row["Name"] || "").trim() || null;

  if (securityType === "OPTION") {
    const occ = parseOccSymbol(symbolRaw);
    if (!occ) {
      // Surface the original symbol so the user can spot the broken row,
      // but don't throw — one weird row shouldn't kill an upload.
      return {
        securityType: "OPTION",
        symbol: symbolRaw,
        exchange,
        mic,
        name: name || symbolRaw,
        option: null,
      };
    }
    return {
      securityType: "OPTION",
      symbol: occ.occSymbol,
      exchange,
      mic,
      name: name || formatOptionName(occ),
      option: occ,
    };
  }

  if (securityType === "CRYPTOCURRENCY") {
    return {
      securityType: "CRYPTOCURRENCY",
      symbol: symbolRaw.toUpperCase(),
      exchange: "",
      mic: "",
      name,
      option: null,
    };
  }

  if (securityType === "PRECIOUS_METAL") {
    return {
      securityType: "PRECIOUS_METAL",
      symbol: symbolRaw.toUpperCase(),
      exchange: "",
      mic: "",
      name,
      option: null,
    };
  }

  // EQUITY / EXCHANGE_TRADED_FUND / OTHER
  const mapped =
    securityType === "EQUITY" || securityType === "EXCHANGE_TRADED_FUND"
      ? securityType
      : "OTHER";
  return {
    securityType: mapped,
    symbol: symbolRaw.toUpperCase(),
    exchange,
    mic,
    name,
    option: null,
  };
}
