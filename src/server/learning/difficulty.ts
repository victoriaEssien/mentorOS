/**
 * Adaptive difficulty (PRD §17, behaviour 6). Keep succeeding and it gets harder; keep failing and
 * it steps back toward fundamentals. Pure and deterministic, so the mission generator is told the
 * level rather than guessing it.
 *
 * Difficulty runs 1 (recall) to 5 (transfer to an unseen problem), the same scale as assessment
 * items.
 */

export type Outcome = "strong" | "pass" | "partial" | "fail";

export type DifficultyMode = "advance" | "consolidate" | "remediate";

export type DifficultyPlan = {
  difficulty: number;
  mode: DifficultyMode;
  /** Plain-language reason, shown as part of the mission's "why now". */
  reason: string;
};

export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

const clampDifficulty = (value: number) =>
  Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Math.round(value)));

const succeeded = (outcome: Outcome | undefined) => outcome === "strong" || outcome === "pass";

/** Starting level for a skill with no attempts yet: 0–0.2 → 1, 0.2–0.4 → 2, … 0.8–1 → 5. */
export function baselineDifficulty(ability: number): number {
  return clampDifficulty(1 + Math.floor(Math.min(0.999, Math.max(0, ability)) * 5));
}

export function planDifficulty({
  ability,
  recentOutcomes,
  lastDifficulty,
}: {
  ability: number;
  /** Outcomes of recent missions and checks on this skill, most recent first. */
  recentOutcomes: readonly Outcome[];
  /** Difficulty of the most recent attempt, if there was one. */
  lastDifficulty?: number | null;
}): DifficultyPlan {
  const start = lastDifficulty ? clampDifficulty(lastDifficulty) : baselineDifficulty(ability);
  const [last, previous] = recentOutcomes;

  if (last === undefined) {
    return {
      difficulty: start,
      mode: "consolidate",
      reason: "Pitched at your current estimate for this skill.",
    };
  }

  if (last === "fail" && previous === "fail") {
    return {
      difficulty: clampDifficulty(start - 2),
      mode: "remediate",
      reason: "Two misses in a row, so this goes back to the fundamentals before trying again.",
    };
  }

  if (last === "fail") {
    return {
      difficulty: clampDifficulty(start - 1),
      mode: "consolidate",
      reason: "The last attempt didn't land, so this one is a step back.",
    };
  }

  if (last === "partial") {
    return {
      difficulty: start,
      mode: "consolidate",
      reason: "Close last time. Same level, from a different angle.",
    };
  }

  if (last === "strong" || succeeded(previous)) {
    return {
      difficulty: clampDifficulty(start + 1),
      mode: "advance",
      reason: "You handled the last ones cleanly, so this one asks more.",
    };
  }

  return {
    difficulty: start,
    mode: "consolidate",
    reason: "One more at this level to confirm it wasn't luck.",
  };
}
