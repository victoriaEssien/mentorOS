import "server-only";
import { and, count, desc, eq, lte, notInArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { concept, conceptAttempt, conceptSchedule } from "@/db/schema";
import { findConcept } from "@/lib/themes";

/** Every concept attempt, newest first: the history to scroll back through. */
export async function getConceptHistory(userId: string) {
  const rows = await db
    .select({
      id: conceptAttempt.id,
      day: conceptAttempt.day,
      slug: conceptAttempt.conceptSlug,
      kind: conceptAttempt.kind,
      verdict: conceptAttempt.verdict,
      explainedAt: conceptAttempt.explainedAt,
    })
    .from(conceptAttempt)
    .where(eq(conceptAttempt.userId, userId))
    .orderBy(desc(conceptAttempt.day), desc(conceptAttempt.createdAt))
    .limit(200);
  return rows.flatMap((row) => {
    const entry = findConcept(row.slug);
    return entry ? [{ ...row, title: entry.concept.title, theme: entry.theme.title }] : [];
  });
}

/** One attempt with its concept: the stored checklist and reference once written, and the theme. */
export async function getAttempt(userId: string, attemptId: string) {
  if (!z.uuid().safeParse(attemptId).success) return null;
  const [row] = await db
    .select()
    .from(conceptAttempt)
    .where(and(eq(conceptAttempt.id, attemptId), eq(conceptAttempt.userId, userId)))
    .limit(1);
  const entry = row ? findConcept(row.conceptSlug) : null;
  if (!row || !entry) return null;
  const [stored] = await db.select().from(concept).where(eq(concept.slug, row.conceptSlug)).limit(1);
  return { attempt: row, stored: stored ?? null, entry: entry.concept, theme: entry.theme };
}

/** Reviews that are due but didn't fit in today's session: they roll over to tomorrow. */
export async function countRolledOver(userId: string, today: string, inSession: string[]) {
  const [row] = await db
    .select({ due: count() })
    .from(conceptSchedule)
    .where(
      and(
        eq(conceptSchedule.userId, userId),
        lte(conceptSchedule.nextReviewOn, today),
        inSession.length > 0 ? notInArray(conceptSchedule.conceptSlug, inSession) : undefined,
      ),
    );
  return Number(row?.due ?? 0);
}
