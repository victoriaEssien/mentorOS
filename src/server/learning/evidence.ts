import { estimateSkill, PRIOR_ABILITY, type EvidenceObservation, type SkillEstimate } from "./skill-estimate";

/**
 * How new evidence changes each affected skill. Pure: the database layer (profile.ts) loads the
 * existing observations, calls this, and writes the result.
 */

export type EvidenceRowInput = Pick<EvidenceObservation, "score" | "confidence" | "sourceType"> & {
  skillId: string;
};

export type SkillChange = {
  skillId: string;
  before: SkillEstimate;
  after: SkillEstimate;
};

export function planSkillChanges(
  existingBySkill: ReadonlyMap<string, readonly EvidenceObservation[]>,
  newRows: readonly EvidenceRowInput[],
  now: Date,
): SkillChange[] {
  const skillIds = [...new Set(newRows.map((row) => row.skillId))];

  return skillIds.map((skillId) => {
    const prior = existingBySkill.get(skillId) ?? [];
    const added = newRows
      .filter((row) => row.skillId === skillId)
      .map((row): EvidenceObservation => ({ ...row, createdAt: now }));

    return {
      skillId,
      before: estimateSkill([...prior], now),
      after: estimateSkill([...prior, ...added], now),
    };
  });
}

/**
 * How far each observation moved the ability estimate when it arrived, oldest first: the
 * deltas in a skill's evidence journal. Each step is estimated as of that observation's time, and
 * the first one is measured from the neutral starting point the estimate shrinks toward.
 */
export function replayEvidence<T extends EvidenceObservation>(
  observations: readonly T[],
): (T & { abilityBefore: number; abilityAfter: number; delta: number })[] {
  const ordered = [...observations].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return ordered.map((observation, index) => {
    const before =
      index === 0 ? PRIOR_ABILITY : estimateSkill(ordered.slice(0, index), observation.createdAt).ability;
    const after = estimateSkill(ordered.slice(0, index + 1), observation.createdAt).ability;
    return {
      ...observation,
      abilityBefore: before,
      abilityAfter: after,
      delta: Math.round((after - before) * 1000) / 1000,
    };
  });
}
