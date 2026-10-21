"use server";

import { redirect } from "next/navigation";

import { startDiagnostic } from "@/server/learning/loop";
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
