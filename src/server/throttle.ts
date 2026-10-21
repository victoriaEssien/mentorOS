import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";

import { db } from "@/db";
import { throttle } from "@/db/schema";

/** At most `max` goes per window of `perSeconds`, counted from the first go. */
export type Limit = { max: number; perSeconds: number };

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
