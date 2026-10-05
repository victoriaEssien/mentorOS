import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { assessment, assessmentAttempt, assessmentItem } from "@/db/schema";
import type { AssessmentResponse } from "@/lib/assessment-response";

/**
 * Taking an assessment: the attempt starts on the first saved answer and answers save as the
 * learner goes, so closing the app mid-assessment loses nothing.
 *
 * Each call is one batched transaction (one round trip on neon-http). The writes carry their own
 * guards, so a request for someone else's assessment, or one already handed in, writes nothing;
 * the state read in the same batch says which error to raise.
 */

export class AssessmentNotFoundError extends Error {
  constructor() {
    super("Assessment not found");
    this.name = "AssessmentNotFoundError";
  }
}

/** Already handed in. Answers are evidence once graded, so they can't change afterwards. */
export class AssessmentClosedError extends Error {
  constructor() {
    super("Assessment already handed in");
    this.name = "AssessmentClosedError";
  }
}

/**
 * Starts the attempt in progress, on an assessment the learner owns and hasn't handed in. The
 * partial unique index allows one open attempt, so a racing insert does nothing.
 */
function startAttempt(userId: string, assessmentId: string) {
  return db.execute(sql`
    insert into assessment_attempt (assessment_id, user_id)
    select a.id, a.user_id from assessment a
    where a.id = ${assessmentId} and a.user_id = ${userId}
      and not exists (
        select 1 from assessment_attempt done
        where done.assessment_id = a.id and done.user_id = a.user_id and done.completed_at is not null
      )
    on conflict (assessment_id, user_id) where completed_at is null do nothing
  `);
}

/** Whether the learner owns the assessment (no row if not), the item is in it, and it's handed in. */
function readState(userId: string, assessmentId: string, itemId?: string) {
  // The subqueries compare against the ids as parameters, not the outer row's columns: Drizzle
  // leaves columns unqualified in a single-table select, so "id" would bind to the inner table.
  return db
    .select({
      hasItem: itemId
        ? sql<boolean>`exists (select 1 from ${assessmentItem} where ${assessmentItem.id} = ${itemId} and ${assessmentItem.assessmentId} = ${assessmentId})`
        : sql<boolean>`true`,
      handedIn: sql<boolean>`exists (select 1 from ${assessmentAttempt} where ${assessmentAttempt.assessmentId} = ${assessmentId} and ${assessmentAttempt.userId} = ${userId} and ${assessmentAttempt.completedAt} is not null)`,
    })
    .from(assessment)
    .where(and(eq(assessment.id, assessmentId), eq(assessment.userId, userId)))
    .limit(1);
}

function assertOpen(state: { hasItem: boolean; handedIn: boolean } | undefined) {
  if (!state?.hasItem) throw new AssessmentNotFoundError();
  if (state.handedIn) throw new AssessmentClosedError();
}

/** The learner's attempt in progress, created if they haven't answered anything yet. */
export async function openAttempt(userId: string, assessmentId: string): Promise<string> {
  const [, [state], [attempt]] = await db.batch([
    startAttempt(userId, assessmentId),
    readState(userId, assessmentId),
    db
      .select({ id: assessmentAttempt.id })
      .from(assessmentAttempt)
      .where(
        and(
          eq(assessmentAttempt.assessmentId, assessmentId),
          eq(assessmentAttempt.userId, userId),
          isNull(assessmentAttempt.completedAt),
        ),
      )
      .limit(1),
  ]);
  assertOpen(state);
  return attempt.id;
}

export async function saveResponse(
  userId: string,
  assessmentId: string,
  itemId: string,
  response: AssessmentResponse,
): Promise<void> {
  const [, , [state]] = await db.batch([
    startAttempt(userId, assessmentId),
    db.execute(sql`
      insert into assessment_response (attempt_id, item_id, response)
      select attempt.id, item.id, ${JSON.stringify(response)}::jsonb
      from assessment_attempt attempt
      join assessment_item item on item.assessment_id = attempt.assessment_id
      where attempt.assessment_id = ${assessmentId} and attempt.user_id = ${userId}
        and attempt.completed_at is null and item.id = ${itemId}
      on conflict (attempt_id, item_id) do update set response = excluded.response
    `),
    readState(userId, assessmentId, itemId),
  ]);
  assertOpen(state);
}
