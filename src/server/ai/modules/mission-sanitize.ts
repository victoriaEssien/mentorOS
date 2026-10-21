import type { GeneratedMission } from "../schemas";

/**
 * Holds the Mission Generator's output to what the app can use. The schema guarantees shape;
 * this guarantees meaning:
 *
 * - skills come from the allowed list, with the path item's skill first and always present
 * - every criterion is scored out of 10 and has a key, so evaluations line up with it
 * - time fits the cadence: a daily mission is an evening, a weekly challenge a weekend
 * - resource links are plain web links or nothing: no javascript:, no made-up schemes
 */

export const MINUTES = {
  daily: { min: 15, max: 120 },
  weekly: { min: 120, max: 600 },
} as const;

export function sanitizeMission(
  mission: GeneratedMission,
  {
    cadence,
    focusSkill,
    allowedSkills,
  }: { cadence: "daily" | "weekly"; focusSkill: string | null; allowedSkills: ReadonlySet<string> },
): GeneratedMission {
  const skills = [
    ...new Set([
      ...(focusSkill ? [focusSkill] : []),
      ...mission.skills.map((slug) => slug.trim().toLowerCase()).filter((slug) => allowedSkills.has(slug)),
    ]),
  ];

  const usedKeys = new Set<string>();
  const evaluationCriteria = mission.evaluationCriteria
    .filter((criterion) => criterion.label.trim() && criterion.description.trim())
    .map((criterion, index) => {
      let key = slugify(criterion.key) || slugify(criterion.label) || `criterion-${index + 1}`;
      while (usedKeys.has(key)) key = `${key}-${index + 1}`;
      usedKeys.add(key);
      return { key, label: criterion.label.trim(), description: criterion.description.trim(), maxScore: 10 };
    });

  const { min, max } = MINUTES[cadence];

  return {
    ...mission,
    title: mission.title.trim(),
    objective: mission.objective.trim(),
    reason: mission.reason.trim(),
    instructions: mission.instructions.trim(),
    deliverable: mission.deliverable.trim(),
    estimatedMinutes: Math.min(max, Math.max(min, Math.round(mission.estimatedMinutes))),
    skills,
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

function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
