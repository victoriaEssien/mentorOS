"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { assessmentResponseSchema } from "@/lib/assessment-response";
import {
  AssessmentClosedError,
  AssessmentNotFoundError,
  openAttempt,
  saveResponse,
} from "@/server/learning/attempts";
import { submitAssessmentAttempt } from "@/server/learning/loop";
import { requireUser } from "@/server/session";

const uuid = z.uuid();

// requireUser, not requireLearner: only onboarded learners have assessments, and the ownership
// check in every write covers the rest. Saves run on every answer, so the profile read is skipped.

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveResponseAction(
  assessmentId: string,
  itemId: string,
  response: unknown,
): Promise<SaveResult> {
  const user = await requireUser();

  const parsed = assessmentResponseSchema.safeParse(response);
  if (!uuid.safeParse(assessmentId).success || !uuid.safeParse(itemId).success || !parsed.success) {
    return { ok: false, error: "That answer couldn't be saved. Try again." };
  }

  try {
    await saveResponse(user.id, assessmentId, itemId, parsed.data);
    return { ok: true };
  } catch (error) {
    if (error instanceof AssessmentNotFoundError)
      return { ok: false, error: "This assessment no longer exists." };
    if (error instanceof AssessmentClosedError) {
      return { ok: false, error: "You already handed this in, so answers can't change now." };
    }
    throw error;
  }
}

export type FinishState = { error?: string };

// Bound to the assessment and used with useActionState, which also passes the previous state.
export async function finishAssessmentAction(assessmentId: string): Promise<FinishState> {
  const user = await requireUser();
  if (!uuid.safeParse(assessmentId).success) return { error: "This assessment no longer exists." };

  try {
    // Ensures an attempt exists even if every answer was "I don't know".
    const attemptId = await openAttempt(user.id, assessmentId);
    await submitAssessmentAttempt(user.id, attemptId);
  } catch (error) {
    if (error instanceof AssessmentNotFoundError) return { error: "This assessment no longer exists." };
    // Handed in from another tab or a double tap: the results are already there.
    if (!(error instanceof AssessmentClosedError)) {
      console.error(
        JSON.stringify({ event: "assessment.grading_failed", assessmentId, reason: String(error) }),
      );
      return { error: "Grading didn't finish. Your answers are saved; try again in a moment." };
    }
  }

  redirect(`/assessments/${assessmentId}/results`);
}
