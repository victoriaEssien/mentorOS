import "server-only";
import { and, desc, eq, gte, isNotNull, max } from "drizzle-orm";

import { db } from "@/db";
import { conceptAttempt, conceptSchedule, mission, themeRun } from "@/db/schema";
import { MISSION_STATUS_LABEL } from "@/lib/mission-labels";
import { findConcept, nextTheme, themeBySlug } from "@/lib/themes";
import type { DailyDigest, WeeklyDigest } from "@/server/email/engagement-emails";
import { daysBetween, pickReviews } from "@/server/learning/repetition";

const DAY_MS = 24 * 60 * 60 * 1000;

/** What a learner's last week showed, for the Monday email. */
export async function getWeeklyDigest(userId: string, since: Date, now: Date): Promise<WeeklyDigest> {
  const today = now.toISOString().slice(0, 10);
  const [attempts, [run]] = await Promise.all([
    db
      .select({ slug: conceptAttempt.conceptSlug, verdict: conceptAttempt.verdict })
      .from(conceptAttempt)
      .where(
        and(
          eq(conceptAttempt.userId, userId),
          isNotNull(conceptAttempt.verdict),
          gte(conceptAttempt.explainedAt, since),
        ),
      )
      .orderBy(conceptAttempt.explainedAt),
    db
      .select({ themeSlug: themeRun.themeSlug, endsOn: themeRun.endsOn, missionId: themeRun.missionId })
      .from(themeRun)
      .where(eq(themeRun.userId, userId))
      .orderBy(desc(themeRun.startsOn))
      .limit(1),
  ]);
  const project = run?.missionId
    ? (
        await db
          .select({ title: mission.title, status: mission.status })
          .from(mission)
          .where(eq(mission.id, run.missionId))
          .limit(1)
      )[0]
    : undefined;

  return {
    concepts: attempts.flatMap((a) => {
      const entry = findConcept(a.slug);
      return entry && a.verdict ? [{ title: entry.concept.title, verdict: a.verdict }] : [];
    }),
    project: project ? { title: project.title, status: MISSION_STATUS_LABEL[project.status].toLowerCase() } : null,
    theme: themeFor(run, today).title,
  };
}

/** The theme running today, or the one that starts when they're next back. */
function themeFor(run: { themeSlug: string; endsOn: string } | undefined, today: string) {
  const running = run && run.endsOn > today ? themeBySlug(run.themeSlug) : undefined;
  return running ?? nextTheme(run?.themeSlug ?? null);
}

/**
 * What the daily email says, worked out without building the session: the theme's next new
 * concept, the reviews due (capped as the session will be), how yesterday went, time away, and the
 * project's days left.
 */
export async function getDailyDigest(userId: string, now: Date): Promise<DailyDigest> {
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10);
  const [[run], scheduled, explainedYesterday, [last]] = await Promise.all([
    db
      .select({ themeSlug: themeRun.themeSlug, endsOn: themeRun.endsOn, missionId: themeRun.missionId })
      .from(themeRun)
      .where(eq(themeRun.userId, userId))
      .orderBy(desc(themeRun.startsOn))
      .limit(1),
    db
      .select({
        conceptSlug: conceptSchedule.conceptSlug,
        nextReviewOn: conceptSchedule.nextReviewOn,
        lastVerdict: conceptSchedule.lastVerdict,
      })
      .from(conceptSchedule)
      .where(eq(conceptSchedule.userId, userId)),
    db
      .select({ slug: conceptAttempt.conceptSlug, verdict: conceptAttempt.verdict })
      .from(conceptAttempt)
      .where(
        and(
          eq(conceptAttempt.userId, userId),
          eq(conceptAttempt.day, yesterday),
          isNotNull(conceptAttempt.verdict),
        ),
      ),
    db
      .select({ at: max(conceptAttempt.explainedAt) })
      .from(conceptAttempt)
      .where(eq(conceptAttempt.userId, userId)),
  ]);

  const theme = themeFor(run, today);
  const running = run !== undefined && theme.slug === run.themeSlug && run.endsOn > today;
  const introduced = new Set(scheduled.map((s) => s.conceptSlug));
  const fresh = theme.concepts.find((c) => !introduced.has(c.slug)) ?? null;
  const { picked } = pickReviews(scheduled, today, { exclude: new Set(fresh ? [fresh.slug] : []) });

  const project =
    running && run?.missionId
      ? (
          await db
            .select({ title: mission.title, status: mission.status })
            .from(mission)
            .where(eq(mission.id, run.missionId))
            .limit(1)
        )[0]
      : undefined;

  return {
    theme: theme.title,
    newConcept: fresh?.title ?? null,
    reviewsDue: picked.length,
    yesterday: explainedYesterday.flatMap((a) => {
      const entry = findConcept(a.slug);
      return entry && a.verdict ? [{ title: entry.concept.title, verdict: a.verdict }] : [];
    }),
    daysAway: last?.at ? Math.floor((now.getTime() - last.at.getTime()) / DAY_MS) : null,
    project:
      project && run && (project.status === "assigned" || project.status === "in_progress")
        ? { title: project.title, daysLeft: daysBetween(today, run.endsOn) }
        : null,
  };
}
