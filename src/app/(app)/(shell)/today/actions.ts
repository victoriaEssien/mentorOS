"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { knownTimeZone, TIME_ZONE_COOKIE, today, weekStartOf } from "@/lib/local-time";
import { dailySet, startDiagnostic, weeklyPostDraft } from "@/server/learning/loop";
import { NothingToPostError, TooManyDraftsError } from "@/server/learning/weekly-post";
import { RunnerUnavailableError } from "@/server/runner/run";
import { requireLearner } from "@/server/session";

export type WriteDiagnosticState = { error?: string };

/** Writes the diagnostic onboarding couldn't, and opens it. */
export async function writeDiagnosticAction(): Promise<WriteDiagnosticState> {
  const { user } = await requireLearner();
  let assessmentId: string;
  try {
    ({ assessmentId } = await startDiagnostic(user.id));
  } catch (error) {
    console.error(JSON.stringify({ event: "diagnostic.failed", reason: String(error) }));
    return { error: "Writing it didn't finish. Try again in a moment." };
  }
  redirect(`/assessments/${assessmentId}`);
}

export type DailySetState = { error?: string };

/** Writes today's coding set (or finds it) and opens it. */
export async function getDailySetAction(): Promise<DailySetState> {
  const { user } = await requireLearner();
  const day = today(knownTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value));
  let assessmentId: string;
  try {
    ({ assessmentId } = await dailySet(user.id, day));
  } catch (error) {
    console.error(JSON.stringify({ event: "daily.failed", reason: String(error) }));
    return {
      error:
        error instanceof RunnerUnavailableError
          ? "Running code isn't working right now, and every question is checked by running it. Try again later."
          : "Writing today's set didn't finish. Try again in a moment.",
    };
  }
  redirect(`/assessments/${assessmentId}`);
}

export type PostState = { error?: string };

/** Drafts (or redrafts) this week's posts and shows them. */
export async function draftPostAction(): Promise<PostState> {
  const { user } = await requireLearner();
  const weekStart = weekStartOf(today(knownTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value)));
  try {
    await weeklyPostDraft(user.id, weekStart);
  } catch (error) {
    if (error instanceof NothingToPostError) {
      return { error: "Nothing's been handed in this week yet. Finish a mission or today's five first." };
    }
    if (error instanceof TooManyDraftsError) {
      return { error: "That's four drafts this week. Edit the last one; it's yours to change." };
    }
    console.error(JSON.stringify({ event: "post.failed", reason: String(error) }));
    return { error: "Drafting didn't finish. Try again in a moment." };
  }
  refresh();
  return {};
}
