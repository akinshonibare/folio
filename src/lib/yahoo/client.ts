import YahooFinance from "yahoo-finance2";

/**
 * yahoo-finance2 v3 requires a constructed instance — the default export
 * isn't a usable singleton on its own (calling `.quote()` on it throws).
 * This module exports a process-wide instance.
 *
 * Notes:
 * - Schema validation is disabled globally. Yahoo changes their response
 *   shape unannounced and the library's strict validator routinely throws
 *   on otherwise-good data (especially `screener`). We cast results at the
 *   call site instead.
 * - Survey + "rip" notices suppressed so server logs stay clean.
 */
export const yahoo = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
  validation: { logErrors: false, logOptionsErrors: false },
});
