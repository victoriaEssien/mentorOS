"use server";

import { redirect } from "next/navigation";

import { testSkill } from "@/server/learning/loop";
import { requireLearner } from "@/server/session";

export type TestState = { error?: string };

/** Writes a check on this skill (or finds the one waiting) and opens it in the player. */
export async function testSkillAction(slug: string): Promise<TestState> {
  const { user } = await requireLearner();
  let assessmentId: string;
  try {
    ({ assessmentId } = await testSkill(user.id, slug));
  } catch (error) {
    console.error(JSON.stringify({ event: "check.create_failed", slug, reason: String(error) }));
    return { error: "Writing the check didn't finish. Try again in a moment." };
  }
  redirect(`/assessments/${assessmentId}`);
}
