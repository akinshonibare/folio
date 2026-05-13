/**
 * Verify a request originated from Vercel's cron scheduler (or a local
 * developer with the same secret). Vercel auto-attaches
 *   `Authorization: Bearer <CRON_SECRET>`
 * on cron invocations when CRON_SECRET is configured.
 */
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}
