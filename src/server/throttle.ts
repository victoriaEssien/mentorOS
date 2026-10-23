import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { throttle } from "@/db/schema";

/** At most `max` goes per window of `perSeconds`, counted from the first go. */
export type Limit = { max: number; perSeconds: number };

/** A key naming an action and whose it is, without keeping an address or an email in the clear. */
export function throttleKey(action: string, who: string): string {
  const hash = createHash("sha256").update(who.trim().toLowerCase()).digest("base64url");
  return `${action}:${hash.slice(0, 22)}`;
}

/** The caller's IP as Vercel reports it, or "local" in development, where nothing sets it. */
export async function clientAddress(): Promise<string> {
  const list = await headers();
  return list.get("x-real-ip") ?? list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Ends a key's window early: for a key used as a lock, once its work has finished or failed. */
export async function release(key: string): Promise<void> {
  await db.delete(throttle).where(eq(throttle.key, key));
}

/** Drops counters whose window ended more than a day ago. The daily job calls it. */
export async function pruneThrottle(): Promise<number> {
  const gone = await db
    .delete(throttle)
    .where(lt(throttle.windowStart, sql`now() - interval '1 day'`))
    .returning({ key: throttle.key });
  return gone.length;
}

const windowOpenedAfter = (limit: Limit) => sql`now() - make_interval(secs => ${limit.perSeconds})`;

/** Counts one go against `key`, and says whether it was within the limit. */
export async function take(key: string, limit: Limit): Promise<boolean> {
  const expired = sql`${throttle.windowStart} <= ${windowOpenedAfter(limit)}`;
  const [row] = await db
    .insert(throttle)
    .values({ key })
    .onConflictDoUpdate({
      target: throttle.key,
      set: {
        hits: sql`case when ${expired} then 1 else ${throttle.hits} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${throttle.windowStart} end`,
      },
    })
    .returning({ hits: throttle.hits });
  return (row?.hits ?? 1) <= limit.max;
}

/** Whether `key` has a go left in its window, without using it. */
export async function hasRoom(key: string, limit: Limit): Promise<boolean> {
  const [row] = await db
    .select({ hits: throttle.hits })
    .from(throttle)
    .where(and(eq(throttle.key, key), gt(throttle.windowStart, windowOpenedAfter(limit))))
    .limit(1);
  return !row || row.hits < limit.max;
}
