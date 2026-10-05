/**
 * Surprise assessment scheduling (PRD §18, behaviour 8). Pure: callers load the learner's skill
 * estimates and the time of their last surprise check.
 *
 * What gets tested: skills the learner has demonstrated (ability at least RETENTION_MIN_ABILITY)
 * whose evidence is old enough to have faded, preferring older and less certain ones.
 *
 * When: never within SURPRISE_COOLDOWN_DAYS of the last one, and otherwise only on "surprise
 * days". A hash of learner and date decides those, so the answer is stable within a day (opening
 * the app ten times does not roll ten dice) but the learner cannot predict it.
 */

export type RetentionCandidate = {
  skillSlug: string;
  ability: number;
  confidence: number;
  evidenceCount: number;
  lastEvidenceAt: Date;
};

export const RETENTION_MIN_AGE_DAYS = 14;
export const RETENTION_MIN_ABILITY = 0.45;
export const SURPRISE_COOLDOWN_DAYS = 4;
export const SURPRISE_DAY_CHANCE = 0.4;

/** Staleness stops growing after this many days; a two-month-old skill is as due as a year-old one. */
const STALENESS_SATURATION_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

export function retentionPriority(candidate: RetentionCandidate, now: Date): number {
  const ageDays = (now.getTime() - candidate.lastEvidenceAt.getTime()) / DAY_MS;
  if (candidate.evidenceCount === 0) return 0;
  if (ageDays < RETENTION_MIN_AGE_DAYS) return 0;
  if (candidate.ability < RETENTION_MIN_ABILITY) return 0;

  const staleness = Math.min(1, ageDays / STALENESS_SATURATION_DAYS);
  const uncertainty = 1 - candidate.confidence * 0.5;
  const worthKeeping = 0.5 + candidate.ability * 0.5;
  return staleness * uncertainty * worthKeeping;
}

/** The skills most worth re-testing now, best first. */
export function pickRetentionChecks(
  candidates: readonly RetentionCandidate[],
  now: Date = new Date(),
  limit = 1,
): RetentionCandidate[] {
  return candidates
    .map((candidate) => ({ candidate, priority: retentionPriority(candidate, now) }))
    .filter((entry) => entry.priority > 0)
    .sort((a, b) => b.priority - a.priority || a.candidate.skillSlug.localeCompare(b.candidate.skillSlug))
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export function isSurpriseCheckDue({
  userId,
  lastSurpriseAt,
  now = new Date(),
  chance = SURPRISE_DAY_CHANCE,
}: {
  userId: string;
  lastSurpriseAt: Date | null;
  now?: Date;
  chance?: number;
}): boolean {
  if (lastSurpriseAt && now.getTime() - lastSurpriseAt.getTime() < SURPRISE_COOLDOWN_DAYS * DAY_MS) {
    return false;
  }
  const day = now.toISOString().slice(0, 10);
  return hashToUnit(`${userId}:${day}`) < chance;
}

/** FNV-1a, mapped to [0, 1). Deterministic and well spread; not for security. */
export function hashToUnit(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x1_0000_0000;
}
