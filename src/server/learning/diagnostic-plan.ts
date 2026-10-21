/**
 * Which skills a diagnostic probes, and how the work is split for parallel generation. Pure.
 *
 * A diagnostic is broad, not deep: it touches each group in the learner's tracks so the first
 * profile has no blind spots, then missions and checks add depth where it matters.
 */

export type CandidateSkill = {
  slug: string;
  name: string;
  description: string | null;
  trackId: string;
  /** The group this skill sits under in its track. */
  parentId: string;
  /** False when the skill is borrowed from another track (SQL placed under Data Analysis). */
  home: boolean;
};

export const MAX_DIAGNOSTIC_SKILLS = 10;
export const SKILLS_PER_CHUNK = 4;

/**
 * Round-robin across groups: every group's first (most fundamental) skill, then every group's
 * deepest skill, and so on, until the cap. Order within a group follows the taxonomy, with the
 * track's own skills before ones borrowed from other tracks.
 */
export function pickDiagnosticSkills<T extends CandidateSkill>(
  candidates: readonly T[],
  max = MAX_DIAGNOSTIC_SKILLS,
): T[] {
  const groups = new Map<string, T[]>();
  for (const skill of candidates) {
    const key = `${skill.trackId}:${skill.parentId}`;
    groups.set(key, [...(groups.get(key) ?? []), skill]);
  }

  // Visiting order inside each group: own skills first, last, then the rest; borrowed ones after.
  const queues = [...groups.values()].map((skills) => {
    const own = skills.filter((skill) => skill.home);
    const borrowed = skills.filter((skill) => !skill.home);
    const ordered = own.length <= 2 ? own : [own[0], own[own.length - 1], ...own.slice(1, -1)];
    return [...ordered, ...borrowed];
  });

  const picked: T[] = [];
  const seen = new Set<string>();
  for (let round = 0; picked.length < max && queues.some((queue) => queue.length > round); round++) {
    for (const queue of queues) {
      const skill = queue[round];
      if (!skill || seen.has(skill.slug)) continue;
      seen.add(skill.slug);
      picked.push(skill);
      if (picked.length === max) break;
    }
  }
  return picked;
}

/** Splits skills into chunks that can be written in parallel, with how many items each gets. */
export function planDiagnosticChunks<T>(skills: readonly T[], perChunk = SKILLS_PER_CHUNK) {
  const chunks: { skills: T[]; itemCount: number }[] = [];
  for (let index = 0; index < skills.length; index += perChunk) {
    const slice = skills.slice(index, index + perChunk);
    chunks.push({ skills: slice, itemCount: Math.ceil(slice.length * 1.25) });
  }
  return chunks;
}
