"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { knownTimeZone, TIME_ZONE_COOKIE, today } from "@/lib/local-time";
import { dailySet, startDiagnostic } from "@/server/learning/loop";
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
