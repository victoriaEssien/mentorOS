import "server-only";
import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db";
import { concept, conceptAttempt, conceptSchedule } from "@/db/schema";
import { findConcept } from "@/lib/themes";
import { checkFollowUp, gradeExplanation, writeReviewQuestion } from "@/server/ai/modules/concept-grader";
import { PROMPT_VERSION as WRITER_VERSION, writeConcept } from "@/server/ai/modules/concept-writer";
import { PROMPT_VERSION as GRADER_VERSION } from "@/server/ai/modules/concept-grader";
import { safeUrl } from "@/server/ai/modules/mission-sanitize";
import { release, take, type Limit } from "@/server/throttle";

import { addDays, nextSchedule, pickReviews, verdictFor } from "./repetition";
import { ensureThemeRun } from "./themes";

/**
 * The daily concept practice. Each day's session is the theme's next new concept plus up to three
 * due reviews, chosen in plain code (repetition.ts) and fixed for the day once built. A concept is
 * written once, the first time it's opened (its checklist then grades every explanation of it), and
 * each review asks about it in a fresh way.
 */

const ONE_AT_A_TIME: Limit = { max: 1, perSeconds: 90 };
const WAIT_MS = 60_000;

export class AttemptNotFoundError extends Error {
  constructor() {
    super("Concept attempt not found");
    this.name = "AttemptNotFoundError";
  }
}

export class AttemptClosedError extends Error {
  constructor(readonly reason: "explained" | "past" | "answered" | "not-ready") {
    super(`Concept attempt closed: ${reason}`);
    this.name = "AttemptClosedError";
  }
}

/**
 * Today's session, built the first time it's asked for: the theme's next concept the learner hasn't
 * had yet, and the most overdue, shakiest due reviews. The new concept goes on the schedule at once,
 * due tomorrow, so if it isn't explained today it comes back.
 */
export async function ensureSession(userId: string, today: string) {
  const themeDay = await ensureThemeRun(userId, today);
  const existing = await sessionAttempts(userId, today);
  if (existing.length > 0) return { themeDay, attempts: existing, rolledOver: 0 };

  const lock = `session:${userId}:${today}`;
  if (!(await take(lock, ONE_AT_A_TIME))) {
    return { themeDay, attempts: await waitFor(() => sessionAttempts(userId, today)), rolledOver: 0 };
  }
  try {
    const scheduled = await db
      .select({
        conceptSlug: conceptSchedule.conceptSlug,
        nextReviewOn: conceptSchedule.nextReviewOn,
        lastVerdict: conceptSchedule.lastVerdict,
      })
      .from(conceptSchedule)
      .where(eq(conceptSchedule.userId, userId));
    const introduced = new Set(scheduled.map((entry) => entry.conceptSlug));
    const fresh = themeDay.theme.concepts.find((entry) => !introduced.has(entry.slug)) ?? null;
    const { picked, rolledOver } = pickReviews(scheduled, today, {
      exclude: new Set(fresh ? [fresh.slug] : []),
    });

    const rows = [
      ...(fresh ? [{ userId, conceptSlug: fresh.slug, day: today, kind: "new" as const }] : []),
      ...picked.map((slug) => ({ userId, conceptSlug: slug, day: today, kind: "review" as const })),
    ];
    if (rows.length > 0) await db.insert(conceptAttempt).values(rows).onConflictDoNothing();
    if (fresh) {
      await db
        .insert(conceptSchedule)
        .values({
          userId,
          conceptSlug: fresh.slug,
          introducedOn: today,
          nextReviewOn: addDays(today, 1),
          intervalDays: 1,
        })
        .onConflictDoNothing();
    }
    return { themeDay, attempts: await sessionAttempts(userId, today), rolledOver };
  } finally {
    await release(lock).catch(() => undefined);
  }
}

/**
 * Gets an attempt ready to answer: writes its concept if this is the first time anyone has opened
 * it, and sets the question (the concept's ask for a new one, a fresh scenario for a review).
 */
export async function prepareAttempt(userId: string, attemptId: string) {
  const attempt = await ownAttempt(userId, attemptId);
  const written = await ensureConcept(attempt.conceptSlug);
  if (attempt.question) return { attempt, concept: written };

  let question = written.ask;
  if (attempt.kind === "review") {
    const earlier = await db
      .select({ question: conceptAttempt.question })
      .from(conceptAttempt)
      .where(
        and(
          eq(conceptAttempt.userId, userId),
          eq(conceptAttempt.conceptSlug, attempt.conceptSlug),
          isNotNull(conceptAttempt.question),
        ),
      )
      .orderBy(desc(conceptAttempt.day))
      .limit(5);
    ({ question } = await writeReviewQuestion({
      title: written.title,
      checklist: written.checklist,
      earlierQuestions: earlier.flatMap((row) => (row.question ? [row.question] : [])),
    }));
  }
  const [updated] = await db
    .update(conceptAttempt)
    .set({ question })
    .where(and(eq(conceptAttempt.id, attemptId), isNull(conceptAttempt.question)))
    .returning();
  return { attempt: updated ?? (await ownAttempt(userId, attemptId)), concept: written };
}

/**
 * Grades an explanation against the concept's stored checklist and moves the concept's next review
 * by the verdict. One explanation per attempt, on its own day.
 */
export async function explainAttempt(userId: string, attemptId: string, explanation: string, today: string) {
  const attempt = await ownAttempt(userId, attemptId);
  if (attempt.explainedAt) throw new AttemptClosedError("explained");
  if (attempt.day !== today) throw new AttemptClosedError("past");
  if (!attempt.question) throw new AttemptClosedError("not-ready");
  const written = await ensureConcept(attempt.conceptSlug);

  const { grade, meta } = await gradeExplanation({
    title: written.title,
    question: attempt.question,
    checklist: written.checklist,
    explanation,
  });
  const verdict = verdictFor(grade.points.map((point) => point.status));

  const [updated] = await db
    .update(conceptAttempt)
    .set({
      explanation,
      explainedAt: new Date(),
      grading: { points: grade.points, feedback: grade.feedback },
      verdict,
      followUp: grade.followUp,
      gradedBy: `${meta.model}/${GRADER_VERSION}`,
    })
    // A second submission racing this one finds it already explained.
    .where(and(eq(conceptAttempt.id, attemptId), isNull(conceptAttempt.explainedAt)))
    .returning();
  if (!updated) throw new AttemptClosedError("explained");

  const [previous] = await db
    .select({ step: conceptSchedule.step, lastVerdict: conceptSchedule.lastVerdict })
    .from(conceptSchedule)
    .where(and(eq(conceptSchedule.userId, userId), eq(conceptSchedule.conceptSlug, attempt.conceptSlug)))
    .limit(1);
  const next = nextSchedule(previous ?? { step: 0, lastVerdict: null }, verdict, today);
  await db
    .insert(conceptSchedule)
    .values({ userId, conceptSlug: attempt.conceptSlug, introducedOn: today, lastVerdict: verdict, ...next })
    .onConflictDoUpdate({
      target: [conceptSchedule.userId, conceptSchedule.conceptSlug],
      set: { lastVerdict: verdict, ...next },
    });
  return updated;
}

/** A short check of their answer to the follow-up question. One answer per attempt. */
export async function answerFollowUp(userId: string, attemptId: string, answer: string) {
  const attempt = await ownAttempt(userId, attemptId);
  if (!attempt.followUp || !attempt.explainedAt) throw new AttemptClosedError("not-ready");
  if (attempt.followUpAnswer) throw new AttemptClosedError("answered");
  const written = await ensureConcept(attempt.conceptSlug);

  const { check } = await checkFollowUp({ title: written.title, question: attempt.followUp, answer });
  const [updated] = await db
    .update(conceptAttempt)
    .set({ followUpAnswer: answer, followUpCheck: check })
    .where(and(eq(conceptAttempt.id, attemptId), isNull(conceptAttempt.followUpAnswer)))
    .returning();
  if (!updated) throw new AttemptClosedError("answered");
  return updated;
}

/**
 * The concept as stored, written the first time it's needed. A request that arrives while another
 * is writing it waits for that one rather than paying twice.
 */
async function ensureConcept(slug: string) {
  const stored = await findStoredConcept(slug);
  if (stored) return stored;
  const entry = findConcept(slug);
  if (!entry) throw new AttemptNotFoundError();

  const lock = `concept-write:${slug}`;
  if (!(await take(lock, ONE_AT_A_TIME))) return waitFor(() => findStoredConcept(slug));
  try {
    const { concept: written, meta } = await writeConcept({
      theme: entry.theme.title,
      title: entry.concept.title,
      angle: entry.concept.angle,
      officialDocs: entry.theme.docs,
    });
    // The theme's own docs always show for high-stakes themes; the writer's picks come first.
    const sources = [
      ...written.sources.flatMap((source) => {
        const url = safeUrl(source.url);
        return url ? [{ title: source.title, url }] : [];
      }),
      ...entry.theme.docs,
    ].filter((source, index, all) => all.findIndex((other) => other.url === source.url) === index);
    await db
      .insert(concept)
      .values({
        slug,
        themeSlug: entry.theme.slug,
        title: entry.concept.title,
        ask: written.ask,
        checklist: written.checklist.map((item, index) => ({
          id: item.id.trim() || `point-${index + 1}`,
          point: item.point,
        })),
        reference: written.reference,
        sources: entry.theme.docs.length > 0 ? sources.slice(0, 4) : [],
        generatedBy: `${meta.model}/${WRITER_VERSION}`,
      })
      .onConflictDoNothing();
    return (await findStoredConcept(slug))!;
  } finally {
    await release(lock).catch(() => undefined);
  }
}

async function findStoredConcept(slug: string) {
  const [row] = await db.select().from(concept).where(eq(concept.slug, slug)).limit(1);
  return row ?? null;
}

async function ownAttempt(userId: string, attemptId: string) {
  const [row] = await db
    .select()
    .from(conceptAttempt)
    .where(and(eq(conceptAttempt.id, attemptId), eq(conceptAttempt.userId, userId)))
    .limit(1);
  if (!row) throw new AttemptNotFoundError();
  return row;
}

async function sessionAttempts(userId: string, today: string) {
  return db
    .select()
    .from(conceptAttempt)
    .where(and(eq(conceptAttempt.userId, userId), eq(conceptAttempt.day, today)))
    .orderBy(asc(conceptAttempt.kind), asc(conceptAttempt.createdAt));
}

/** Polls for what another request is writing; empty or null if it never arrives. */
async function waitFor<T>(read: () => Promise<T>): Promise<NonNullable<T>> {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const value = await read();
    if (value && (!Array.isArray(value) || value.length > 0)) return value as NonNullable<T>;
  }
  throw new Error("Timed out waiting for another request to finish writing.");
}
