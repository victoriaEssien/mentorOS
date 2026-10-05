import { NotImplementedError } from "@/lib/errors";

/**
 * Prerequisite gate (behaviour 17: "No, you're not ready yet").
 * Checks skill_prerequisite against current estimates before the planner is allowed to move on.
 */
export type ReadinessResult =
  { ready: true } | { ready: false; missing: { skillSlug: string; ability: number; required: number }[] };

export async function checkReadiness(userId: string, skillSlug: string): Promise<ReadinessResult> {
  void userId;
  void skillSlug;
  throw new NotImplementedError("checkReadiness");
}
