"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { assessmentResponseSchema } from "@/lib/assessment-response";
import {
  AssessmentClosedError,
  AssessmentNotFoundError,
  openAttempt,
  saveResponse,
} from "@/server/learning/attempts";
import { NotRunnableError, TooManyRunsError } from "@/server/learning/daily";
import {
  assignNextMission,
  refreshLearningPath,
  runDailyCode,
  submitAssessmentAttempt,
} from "@/server/learning/loop";
import { RunnerUnavailableError } from "@/server/runner/run";
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
    const { replan } = await submitAssessmentAttempt(user.id, attemptId);
    // Plan after responding: the learner reads their results while the path is written.
    if (replan) after(() => planAfterGrading(user.id));
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

/** First path, then the first mission, so both are waiting when the learner gets to them. */
async function planAfterGrading(userId: string) {
  try {
    await refreshLearningPath(userId);
    await assignNextMission(userId, "daily");
  } catch (error) {
    // The path and missions screens offer to try again when either is missing.
    console.error(JSON.stringify({ event: "path.plan_failed", userId, reason: String(error) }));
  }
}

export type ExampleResult = {
  input: string;
  expected: string;
  stdout: string;
  stderr: string;
  passed: boolean;
  timedOut: boolean;
};

export type RunResult =
  { ok: true; compileError: string | null; examples: ExampleResult[] } | { ok: false; error: string };

/** Runs a daily question's code against its examples. Hidden tests run only at hand-in. */
export async function runCodeAction(assessmentId: string, itemId: string, code: unknown): Promise<RunResult> {
  const user = await requireUser();
  const source = z.string().max(20_000).safeParse(code);
  if (!uuid.safeParse(assessmentId).success || !uuid.safeParse(itemId).success || !source.success) {
    return { ok: false, error: "That code couldn't be run. It may be over 20,000 characters." };
  }

  try {
    const { examples, run } = await runDailyCode(user.id, assessmentId, itemId, source.data);
    return {
      ok: true,
      compileError: run.compileError,
      examples: run.cases.map((result, index) => ({
        input: examples[index]!.input,
        expected: examples[index]!.output,
        stdout: result.stdout,
        stderr: result.stderr,
        passed: result.passed,
        timedOut: result.timedOut,
      })),
    };
  } catch (error) {
    if (error instanceof TooManyRunsError) {
      return {
        ok: false,
        error: "That's 60 runs this hour, the limit. Read it through once more, then try again.",
      };
    }
    if (error instanceof RunnerUnavailableError) {
      console.error(JSON.stringify({ event: "runner.unavailable", reason: error.message }));
      return {
        ok: false,
        error: "Running code isn't working right now. Your code is saved, and you can still hand in.",
      };
    }
    if (error instanceof NotRunnableError)
      return { ok: false, error: "This question isn't answered with code." };
    throw error;
  }
}
