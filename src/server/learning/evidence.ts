import { estimateSkill, type EvidenceObservation, type SkillEstimate } from "./skill-estimate";

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
