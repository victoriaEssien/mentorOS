import "server-only";
import { and, count, eq, gte, lt } from "drizzle-orm";

import { db } from "@/db";
import { evaluation, learningNote, weeklyPost } from "@/db/schema";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The week's post for Today: the draft if there is one, and whether anything was handed in yet, so
 * an empty week doesn't offer to write about nothing.
 */
export async function getWeekPost(userId: string, weekStart: string) {
  const from = new Date(`${weekStart}T00:00:00Z`);
  const to = new Date(from.getTime() + WEEK_MS);
  const [[draft], [graded]] = await Promise.all([
    db
      .select({
        linkedin: weeklyPost.linkedin,
        x: weeklyPost.x,
        drewOn: weeklyPost.drewOn,
        updatedAt: weeklyPost.updatedAt,
      })
      .from(weeklyPost)
      .where(and(eq(weeklyPost.userId, userId), eq(weeklyPost.weekStart, weekStart)))
      .limit(1),
    db
      .select({ handedIn: count() })
      .from(evaluation)
      .where(
        and(eq(evaluation.userId, userId), gte(evaluation.createdAt, from), lt(evaluation.createdAt, to)),
      ),
  ]);
  return { draft: draft ?? null, handedIn: Number(graded?.handedIn ?? 0) };
}

/** The note the learner left on a daily set, if any. */
export async function getDailyNote(userId: string, assessmentId: string) {
  const [note] = await db
    .select({ learned: learningNote.learned, gotWrong: learningNote.gotWrong })
    .from(learningNote)
    .where(and(eq(learningNote.userId, userId), eq(learningNote.assessmentId, assessmentId)))
    .limit(1);
  return note ?? null;
}
