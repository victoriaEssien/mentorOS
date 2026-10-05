"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { AiGenerationError } from "@/server/ai/generate";
import { refreshLearningPath } from "@/server/learning/loop";
import { getLastPlannedAt } from "@/server/queries/path";
import { requireLearner } from "@/server/session";

/** Planning is a model call; one replan a minute is plenty for a person. */
const REPLAN_COOLDOWN_MS = 60_000;

export type PlanState = { ok?: boolean; error?: string };

const requestSchema = z
  .string()
  .trim()
  .min(3, "Say a little more about what you want to change.")
  .max(500, "Keep it under 500 characters.");

export async function askForChangeAction(_previous: PlanState, formData: FormData): Promise<PlanState> {
  const { user } = await requireLearner();
  const parsed = requestSchema.safeParse(formData.get("request"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return plan(user.id, parsed.data);
}

/** For a learner with no path yet, e.g. when planning after the diagnostic failed. */
export async function planPathAction(): Promise<PlanState> {
  const { user } = await requireLearner();
  return plan(user.id, null);
}

async function plan(userId: string, request: string | null): Promise<PlanState> {
  const lastPlannedAt = await getLastPlannedAt(userId);
  if (lastPlannedAt && Date.now() - lastPlannedAt.getTime() < REPLAN_COOLDOWN_MS) {
    return { error: "Your path was just planned. Give it a minute before asking again." };
  }

  try {
    await refreshLearningPath(userId, request);
  } catch (error) {
    console.error(JSON.stringify({ event: "path.plan_failed", userId, reason: String(error) }));
    return {
      error:
        error instanceof AiGenerationError
          ? "I couldn't plan a path from that. Try again, or put it differently."
          : "Planning didn't finish. Try again in a moment.",
    };
  }

  refresh();
  return { ok: true };
}
