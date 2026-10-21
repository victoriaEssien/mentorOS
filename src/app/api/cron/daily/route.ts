import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { runDailyEmails } from "@/server/email/daily";

// A run sends at most DAILY_SEND_CAP emails, a few at a time.
export const maxDuration = 300;

/**
 * The daily job. Vercel Cron calls it once a day (vercel.json) with CRON_SECRET as a bearer token;
 * without the secret configured, or with the wrong one, it does nothing.
 */
export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await runDailyEmails());
}

function authorized(header: string | null): boolean {
  if (!env.CRON_SECRET || !header) return false;
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
