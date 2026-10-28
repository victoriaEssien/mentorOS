import "server-only";

import { renderLearnerContext, type LearnerContext } from "../context";
import { generateStructured, type GenerationMeta } from "../generate";
import type { Effort } from "../provider";
import { generatedMissionSchema, type GeneratedMission } from "../schemas";
import { sanitizeMission } from "./mission-sanitize";

/**
 * Mission Generator
 *
 * Writes one practical mission or weekly challenge (PRD §13, §14, §19) for the learner's current
 * path item, at a difficulty decided in code (src/server/learning/difficulty.ts). Prefers build,
 * debug and design over reading. Weekly challenges can combine skills across tracks
 * (behaviour 12). Does not write to the database.
 */

export const PROMPT_VERSION = "v3";

const SYSTEM_PROMPT = `
You write missions for mentorOS, an AI-managed technical apprenticeship. A mission is one concrete
thing to do that produces evidence of a skill: something built, fixed, designed, analysed or
explained. Missions replace lessons; never "read chapter 4".

Write one mission:
- It practises the path item's skill at the given difficulty: 1 is guided and small, 3 is a
  realistic task with some judgement, 5 is an open problem they haven't seen. The mode says how to
  pitch it: advance (stretch them), consolidate (same level, new angle), remediate (back to
  fundamentals, smaller steps).
- Prefer build, debug, design, analyze or explain over learn or research. Even a learn mission ends
  in something they produce.
- Keep it small enough to finish. A daily mission fits in 30 to 90 minutes: 3 to 6 steps, one
  deliverable, and an explanation of 80 to 150 words. A weekly challenge takes 3 to 6 hours: up to
  10 steps, combining several skills, across their tracks when that makes a better project. Pitch
  depth through the difficulty, never by adding steps or files.
- They work on a laptop and hand in a link (repository, gist, deployed URL) or a written
  explanation, so the deliverable must be checkable from that. Say exactly what to hand in, and
  always ask for a short explanation of their reasoning alongside it.
- instructions: numbered steps, one per line, each one or two sentences, specific enough to start
  without asking anything. Name the simplest setup (language, tools) that suits the track and their
  background. Guide; don't do the work for them.
- requiredKnowledge: what they need to know first, as short phrases.
- evaluationCriteria: 3 to 5 criteria, each out of 10, with what full marks looks like. One of them
  scores the explanation of their reasoning.
- resources: at most three, only what this mission needs. The first explains the idea the mission
  practises (for HTTP, an overview of requests and responses), so a learner new to it knows what to
  read first; the rest are references for the tools they'll use. Use only official documentation or
  well-known references you are sure exist (MDN, the PostgreSQL docs, the Python docs, OWASP).
  Set url to null if you aren't sure of the exact address.
- reason: one or two sentences, as "you": why this mission now. Use the path item's reason and the
  evidence, and say how the difficulty was chosen.
- skills: slugs from the allowed list only; the first is the path item's skill. A side skill (from
  a track they aren't studying, such as security or UI) may be listed only when the mission
  genuinely exercises it, like hashing passwords in an auth mission. Never build a mission around
  one.
- Don't repeat a recent mission. Follow the tone guidance for wording only. No em dashes.
`.trim();

export type GenerateMissionInput = {
  context: LearnerContext;
  cadence: "daily" | "weekly";
  pathItem: { title: string; reason: string; skill: string | null };
  difficulty: { level: number; mode: "advance" | "consolidate" | "remediate"; reason: string };
  /** Skills the mission may list (slug: name). */
  allowedSkills: { slug: string; name: string }[];
  /** Skills from shelved tracks, listed only when the mission genuinely needs one (slug: name). */
  sideSkills: { slug: string; name: string }[];
  /** Recent missions on the same skill, so it doesn't repeat itself. */
  recentMissions: { title: string; outcome: string | null }[];
  effort?: Effort;
  abortSignal?: AbortSignal;
};

export async function generateMission(
  input: GenerateMissionInput,
): Promise<{ mission: GeneratedMission; meta: GenerationMeta }> {
  const { pathItem, difficulty } = input;

  const prompt = [
    renderLearnerContext(input.context),
    "",
    "MISSION TO WRITE",
    `Cadence: ${input.cadence}.`,
    `Path item: "${pathItem.title}"${pathItem.skill ? ` (skill: ${pathItem.skill})` : ""}. Why it's on the path: ${pathItem.reason}`,
    `Difficulty: ${difficulty.level} of 5, mode ${difficulty.mode}. ${difficulty.reason}`,
    "",
    "SKILLS YOU MAY LIST (slug: name)",
    ...input.allowedSkills.map((skill) => `- ${skill.slug}: ${skill.name}`),
    ...(input.sideSkills.length > 0
      ? [
          "",
          "SIDE SKILLS (only when the mission genuinely needs one)",
          ...input.sideSkills.map((skill) => `- ${skill.slug}: ${skill.name}`),
        ]
      : []),
    ...(input.recentMissions.length > 0
      ? [
          "",
          "RECENT MISSIONS ON THIS SKILL (don't repeat them)",
          ...input.recentMissions.map((m) => `- ${m.title}: ${m.outcome ?? "not evaluated"}`),
        ]
      : []),
  ].join("\n");

  const { output, meta } = await generateStructured({
    module: "mission-generator",
    promptVersion: PROMPT_VERSION,
    tier: "smart",
    effort: input.effort,
    instructions: SYSTEM_PROMPT,
    prompt,
    schema: generatedMissionSchema,
    schemaName: "Mission",
    schemaDescription: "One practical mission with instructions, a deliverable and scoring criteria.",
    // About 1,900 tokens for a weekly challenge.
    maxOutputTokens: 6_000,
    timeoutMs: 120_000,
    abortSignal: input.abortSignal,
  });

  const mission = sanitizeMission(output, {
    cadence: input.cadence,
    focusSkill: pathItem.skill,
    allowedSkills: new Set([...input.allowedSkills, ...input.sideSkills].map((skill) => skill.slug)),
  });
  return { mission, meta };
}
