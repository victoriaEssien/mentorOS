"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { knownTimeZone, TIME_ZONE_COOKIE, today } from "@/lib/local-time";
import { AiGenerationError } from "@/server/ai/generate";
import { AttemptClosedError, AttemptNotFoundError } from "@/server/learning/concepts";
import { answerConceptFollowUp, explainConcept, prepareConcept } from "@/server/learning/loop";
import { requireLearner } from "@/server/session";

const uuid = z.uuid();

export type FormState = { error?: string };

const failed = (error: unknown, what: string) => {
  console.error(JSON.stringify({ event: "concept.failed", what, reason: String(error) }));
  return error instanceof AiGenerationError
    ? "The answer didn't come back in a usable shape. Try again."
    : "That didn't finish. Try again in a moment.";
};

/** Writes the concept (first time only) and the question, then shows them. */
export async function prepareConceptAction(attemptId: string): Promise<FormState> {
  const { user } = await requireLearner();
  if (!uuid.safeParse(attemptId).success) return { error: "That concept no longer exists." };
  try {
    await prepareConcept(user.id, attemptId);
  } catch (error) {
    if (error instanceof AttemptNotFoundError) return { error: "That concept no longer exists." };
    return { error: failed(error, "prepare") };
  }
  refresh();
  return {};
}

const explanationSchema = z
  .string()
  .trim()
  .min(150, "Explain how it works, not just what it's called. A short paragraph at least.")
  .max(6000, "Keep it under 6,000 characters. The best explanations are tight.");

/** Grades their explanation against the concept's checklist, then shows the feedback in place. */
export async function explainConceptAction(
  attemptId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireLearner();
  const parsed = explanationSchema.safeParse(formData.get("explanation") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!uuid.safeParse(attemptId).success) return { error: "That concept no longer exists." };

  const day = today(knownTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value));
  try {
    await explainConcept(user.id, attemptId, parsed.data, day);
  } catch (error) {
    if (error instanceof AttemptNotFoundError) return { error: "That concept no longer exists." };
    if (error instanceof AttemptClosedError && error.reason === "past") {
      return { error: "That was another day's session. The concept comes back in your reviews." };
    }
    if (!(error instanceof AttemptClosedError)) return { error: failed(error, "grade") };
  }
  refresh();
  return {};
}

const answerSchema = z
  .string()
  .trim()
  .min(20, "Answer in a sentence or two at least.")
  .max(3000, "Keep it under 3,000 characters.");

/** Checks their answer to the follow-up question. */
export async function answerFollowUpAction(
  attemptId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireLearner();
  const parsed = answerSchema.safeParse(formData.get("answer") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!uuid.safeParse(attemptId).success) return { error: "That concept no longer exists." };
  try {
    await answerConceptFollowUp(user.id, attemptId, parsed.data);
  } catch (error) {
    if (error instanceof AttemptNotFoundError) return { error: "That concept no longer exists." };
    if (!(error instanceof AttemptClosedError)) return { error: failed(error, "follow-up") };
  }
  refresh();
  return {};
}
