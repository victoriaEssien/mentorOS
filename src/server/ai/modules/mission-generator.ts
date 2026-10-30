import "server-only";

import type { ProjectForm } from "@/lib/themes";

import { renderLearnerContext, type LearnerContext } from "../context";
import { generateStructured, type GenerationMeta } from "../generate";
import type { Effort } from "../provider";
import { generatedMissionSchema, type GeneratedMission } from "../schemas";
import { sanitizeMission } from "./mission-sanitize";

/**
 * Project Writer (the mission generator)
 *
 * Writes the project for the learner's current theme: something real to build around the theme's
 * concepts, in a stack decided in code (src/server/learning/mission-stack.ts), at a difficulty
 * decided in code (src/server/learning/difficulty.ts), sized to the theme's weeks. Does not write to
 * the database.
 */

export const PROMPT_VERSION = "v9";

const SYSTEM_PROMPT = `
You write the project for this week's theme, for a software engineer who learns by building and
looking things up when stuck, working toward the bar at top companies. They research a concept a day
from the theme; the project is where they put them together. They build it their own way, share the
repo, and report back. It has to be worth showing off.

Write one project:
- Build the kind of project the theme names, around its concepts. Something real people would
  want, not a tutorial clone.
- The form is decided for you. Shape the theme's project into it, keeping its concepts at the centre
  (for a CLI the same concerns show up as commands, flags and output; for a library, as its public
  API). What done means for each form:
  - web app: runs locally with one command, deployed if the stack makes that easy.
  - backend service: an HTTP or gRPC service with a README showing how to call it.
  - CLI tool: installable (npx, pipx, go install or a binary), --help, clear errors, sensible exit
    codes, and it works in a pipe.
  - library: a small typed public API, docs with examples, tests, and ready to publish to npm or
    PyPI.
  - browser extension: Chrome Manifest V3 with the fewest permissions it needs, loadable unpacked.
  - mobile app: React Native with Expo unless their stack names another mobile framework, running
    in Expo Go or a simulator.
- It runs as long as the theme: durationWeeks is the number of weeks given. Size it to the hours a
  week they told you, less about half an hour a day for the daily concept; with no hours given, a
  week is about 6 to 10 hours of evenings. Scope it to fit. estimatedMinutes is the total effort.
- Pitch it at the difficulty given: 1 is guided and small, 3 is a realistic build with judgement
  calls, 5 is open-ended. The mode says how: advance (stretch them), consolidate (same level, new
  angle), remediate (smaller and more guided).
- The stack is decided for you. "Their stack" means build it with those technologies at production
  depth: real failure modes, edge cases, performance and tests, the parts tutorials skip. "Explore"
  means build it with the one candidate that best fits, and say in the reason why that tool suits
  this job. technology names what it's built with. When the theme's project compares two tools
  (the same app in two frameworks), one is the stack you were given and you pick the other: one
  whose model differs most from it and that they don't already use. Name both in technology.
- Lean on the theme's concepts and name the ones it needs in requiredKnowledge.
- Detailed, never spoon-fed. scenario sets a realistic situation in two or three sentences: who
  needs this, what's missing or broken, and the constraint that makes it interesting.
  acceptanceCriteria are 3 to 7 checkable statements of done (behaviour, the edge cases handled, a
  performance or reliability target, the tests that must exist); the review checks each one.
  stretchGoal is one harder extension, or null.
- instructions: numbered milestones, one per line, each one or two sentences, in the order to
  build them, saying what to achieve and which decisions they must make; never the code to write.
  Name versions and tools concretely.
- deliverable: a public repository link with a README (what it does, how to run it, the decisions
  they made), plus a short report of what they learned and got wrong.
- evaluationCriteria: 3 to 5 criteria, each out of 10, with what full marks looks like. One scores
  the README and their reasoning.
- resources: at most three, only official docs or references you're sure exist. Set url to null if
  you aren't sure of the exact address.
- reason: one or two sentences, as "you": why this project now, and why this size.
- Don't repeat a recent project. Follow the tone guidance for wording only. No em dashes.
`.trim();

export type GenerateMissionInput = {
  context: LearnerContext;
  theme: { title: string; summary: string; project: string; concepts: string[]; weeks: number };
  difficulty: { level: number; mode: "advance" | "consolidate" | "remediate"; reason: string };
  /** Their own stack to go deeper in, or new tools to explore (decided in mission-stack.ts). */
  stack: { mode: "home"; technologies: string[] } | { mode: "explore"; candidates: string[] };
  /** What it's built as (decided in project-form.ts). */
  form: ProjectForm;
  effort?: Effort;
  abortSignal?: AbortSignal;
};

export async function generateMission(
  input: GenerateMissionInput,
): Promise<{ mission: GeneratedMission; meta: GenerationMeta }> {
  const { difficulty } = input;

  const prompt = [
    renderLearnerContext(input.context),
    "",
    "PROJECT TO WRITE",
    `Theme: ${input.theme.title}. ${input.theme.summary}`,
    `The project should be: ${input.theme.project}.`,
    `Its concepts: ${input.theme.concepts.join("; ")}.`,
    `Weeks: ${input.theme.weeks}.`,
    `Form: build it as a ${input.form}.`,
    `Difficulty: ${difficulty.level} of 5, mode ${difficulty.mode}. ${difficulty.reason}`,
    input.stack.mode === "home"
      ? `Stack: their stack, go deeper in it. Their technologies: ${input.stack.technologies.join(", ")}.`
      : `Stack: explore. Pick the one candidate that fits best: ${input.stack.candidates.join("; ")}.`,
  ].join("\n");

  const { output, meta } = await generateStructured({
    module: "mission-generator",
    promptVersion: PROMPT_VERSION,
    tier: "smart",
    effort: input.effort,
    instructions: SYSTEM_PROMPT,
    prompt,
    schema: generatedMissionSchema,
    schemaName: "Project",
    schemaDescription: "One project brief with milestones, a deliverable and review criteria.",
    // About 2,000 tokens for a project brief.
    maxOutputTokens: 6_000,
    timeoutMs: 120_000,
    abortSignal: input.abortSignal,
  });

  return { mission: sanitizeMission({ ...output, durationWeeks: input.theme.weeks }), meta };
}
