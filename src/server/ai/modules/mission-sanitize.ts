import type { GeneratedMission } from "../schemas";

/**
 * Holds the Project Writer's output to what the app can use. The schema guarantees shape; this
 * guarantees meaning:
 *
 * - a project takes 1 to 4 whole weeks, and its effort fits that (at most about 15 hours a week)
 * - every criterion is scored out of 10 and has a key, so evaluations line up with it
 * - resource links are plain web links or nothing: no javascript:, no made-up schemes
 */

const MAX_MINUTES_A_WEEK = 15 * 60;

export function sanitizeMission(mission: GeneratedMission): GeneratedMission {
  const usedKeys = new Set<string>();
  const evaluationCriteria = mission.evaluationCriteria
    .filter((criterion) => criterion.label.trim() && criterion.description.trim())
    .map((criterion, index) => {
      let key = slugify(criterion.key) || slugify(criterion.label) || `criterion-${index + 1}`;
      while (usedKeys.has(key)) key = `${key}-${index + 1}`;
      usedKeys.add(key);
      return { key, label: criterion.label.trim(), description: criterion.description.trim(), maxScore: 10 };
    });

  const durationWeeks = Math.min(4, Math.max(1, Math.round(mission.durationWeeks)));

  return {
    ...mission,
    title: mission.title.trim(),
    objective: mission.objective.trim(),
    scenario: mission.scenario.trim(),
    technology: mission.technology.trim(),
    reason: mission.reason.trim(),
    instructions: mission.instructions.trim(),
    deliverable: mission.deliverable.trim(),
    acceptanceCriteria: mission.acceptanceCriteria.map((item) => item.trim()).filter(Boolean),
    stretchGoal: mission.stretchGoal?.trim() || null,
    durationWeeks,
    estimatedMinutes: Math.min(
      durationWeeks * MAX_MINUTES_A_WEEK,
      Math.max(60, Math.round(mission.estimatedMinutes)),
    ),
    requiredKnowledge: mission.requiredKnowledge.map((item) => item.trim()).filter(Boolean),
    evaluationCriteria,
    resources: mission.resources
      .filter((resource) => resource.title.trim())
      .map((resource) => ({
        title: resource.title.trim(),
        url: safeUrl(resource.url),
        kind: resource.kind.trim() || "docs",
        note: resource.note?.trim() || null,
      })),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Only http(s) links reach the page. */
export function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
