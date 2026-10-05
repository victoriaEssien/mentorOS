/**
 * Prerequisite gate (behaviour 17: "No, you're not ready yet").
 * Pure: callers load the prerequisite edges and the learner's current estimates, then ask.
 *
 * A prerequisite counts as met only when its ability clears READY_ABILITY *and* there is enough
 * evidence to believe it (READY_CONFIDENCE). A lucky guess on one question does not unlock
 * the next skill.
 */

export type PrerequisiteEdge = { skillSlug: string; requiresSlug: string };

export type SkillState = { ability: number; confidence: number };

export const READY_ABILITY = 0.6;
export const READY_CONFIDENCE = 0.35;

export type MissingPrerequisite = {
  skillSlug: string;
  ability: number;
  confidence: number;
  required: number;
};

export type ReadinessResult = { ready: true } | { ready: false; missing: MissingPrerequisite[] };

export function evaluateReadiness(
  skillSlug: string,
  edges: readonly PrerequisiteEdge[],
  estimates: ReadonlyMap<string, SkillState>,
): ReadinessResult {
  const missing = edges
    .filter((edge) => edge.skillSlug === skillSlug)
    .flatMap((edge): MissingPrerequisite[] => {
      const state = estimates.get(edge.requiresSlug) ?? { ability: 0, confidence: 0 };
      const met = state.ability >= READY_ABILITY && state.confidence >= READY_CONFIDENCE;
      return met
        ? []
        : [
            {
              skillSlug: edge.requiresSlug,
              ability: state.ability,
              confidence: state.confidence,
              required: READY_ABILITY,
            },
          ];
    });

  return missing.length === 0 ? { ready: true } : { ready: false, missing };
}

/**
 * Which of the candidate skills are blocked, and by what. Shaped for the Learning Planner's
 * `blocked` input, so the model is told up front what it may not schedule yet.
 */
export function blockedSkills(
  candidates: readonly string[],
  edges: readonly PrerequisiteEdge[],
  estimates: ReadonlyMap<string, SkillState>,
): { skill: string; missing: string[] }[] {
  return candidates.flatMap((skill) => {
    const result = evaluateReadiness(skill, edges, estimates);
    return result.ready ? [] : [{ skill, missing: result.missing.map((m) => m.skillSlug) }];
  });
}
