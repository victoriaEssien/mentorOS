import "server-only";
import { and, desc, eq, gt, lte } from "drizzle-orm";

import { db } from "@/db";
import { themeRun } from "@/db/schema";
import { nextTheme, themeBySlug } from "@/lib/themes";

import { addDays, daysBetween } from "./repetition";

/**
 * The learner's theme for a day, started the first time it's asked for: the theme after the last
 * one, running one or two weeks from that day. Time away doesn't skip themes: the next one starts
 * when they're back.
 */
export async function ensureThemeRun(userId: string, today: string) {
  const current = await findThemeRun(userId, today);
  if (current) return current;

  const [last] = await db
    .select({ themeSlug: themeRun.themeSlug })
    .from(themeRun)
    .where(eq(themeRun.userId, userId))
    .orderBy(desc(themeRun.startsOn))
    .limit(1);
  const theme = nextTheme(last?.themeSlug ?? null);
  await db
    .insert(themeRun)
    .values({ userId, themeSlug: theme.slug, startsOn: today, endsOn: addDays(today, theme.weeks * 7) })
    // Two requests on the same morning: the first one's theme stands.
    .onConflictDoNothing();
  return (await findThemeRun(userId, today))!;
}

/** The theme run covering a day, with its theme and where in it the day falls. */
export async function findThemeRun(userId: string, today: string) {
  const [run] = await db
    .select()
    .from(themeRun)
    .where(and(eq(themeRun.userId, userId), lte(themeRun.startsOn, today), gt(themeRun.endsOn, today)))
    .orderBy(desc(themeRun.startsOn))
    .limit(1);
  const theme = run ? themeBySlug(run.themeSlug) : null;
  if (!run || !theme) return null;
  const day = daysBetween(run.startsOn, today);
  return {
    run,
    theme,
    week: Math.floor(day / 7) + 1,
    daysLeft: daysBetween(today, run.endsOn),
  };
}

export type ThemeDay = NonNullable<Awaited<ReturnType<typeof findThemeRun>>>;
