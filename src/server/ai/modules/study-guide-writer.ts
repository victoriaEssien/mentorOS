import "server-only";

import { renderLearnerContext, type LearnerContext } from "../context";
import { generateStructured, type GenerationMeta } from "../generate";
import { generatedStudyGuideSchema, type GeneratedStudyGuide } from "../schemas";

/**
 * Study Guide Writer
 *
 * Writes how to study one path step (Part D): the ideas in order, what to read, small exercises to
 * try before the mission, the usual mistakes and how to tell it has landed. The weaker the
 * learner's evidence on the skill, the more scaffolding. Does not write to the database.
 */

export const PROMPT_VERSION = "v1";

const SYSTEM_PROMPT = `
You write the study guide for one step of a learner's path in mentorOS, which trains a software
engineer toward the interview and job bar at top companies (FAANG, the AI labs). The guide is what
they read before the step's mission: it has to make clear exactly what to learn, where, and how to
practise, without doing the work for them.

Pitch it from their evidence on this skill:
- Weak or unmeasured (estimate below 0.4, or recent mistakes on it): start from the prerequisite
  idea, put the ideas in small steps, make the first exercises very small, and name their specific
  mistakes as pitfalls.
- Developing (0.4 to 0.7): go straight to the core ideas and the tradeoffs, with exercises that
  combine them.
- Strong (above 0.7): focus on depth, edge cases and what interviewers probe, with harder exercises.

Rules:
- learn: the ideas in the order to learn them, each with why it matters for this learner's goal.
- read: at most four, only official documentation or well-known references you are sure exist (MDN,
  the language's own docs, the PostgreSQL docs, Go by Example, The Rust Book, cp-algorithms, the
  Next.js docs). The first explains the core idea. Set url to null if you aren't sure of the exact
  address. Say what part to read.
- practise: small exercises they can do in 10 to 20 minutes each, easiest first, concrete enough to
  start without asking anything (inputs, what to produce). Not the mission itself.
- pitfalls: the mistakes people make here; lead with any this learner has made.
- checkpoints: how they'll know it has landed, as things they can do.
- Write to them as "you". Plain, specific, no padding, no em dashes. Follow the tone guidance for
  wording only.
`.trim();

export type WriteStudyGuideInput = {
  context: LearnerContext;
  step: { title: string; reason: string };
  skill: {
    slug: string;
    name: string;
    description: string | null;
    estimate: { ability: number; confidence: number; evidenceCount: number } | null;
  } | null;
  abortSignal?: AbortSignal;
};

export async function writeStudyGuide(
  input: WriteStudyGuideInput,
): Promise<{ guide: GeneratedStudyGuide; meta: GenerationMeta }> {
  const { step, skill } = input;
  const prompt = [
    renderLearnerContext(input.context),
    "",
    "STEP TO WRITE A GUIDE FOR",
    `Step: "${step.title}". Why it's on their path: ${step.reason}`,
    skill
      ? `Skill: ${skill.name} (${skill.slug})${skill.description ? `: ${skill.description}` : ""}. ` +
        (skill.estimate
          ? `Their estimate: ability ${skill.estimate.ability.toFixed(2)}, confidence ${skill.estimate.confidence.toFixed(2)}, from ${skill.estimate.evidenceCount} pieces of evidence.`
          : "Not measured yet.")
      : "No single skill: a step that combines several.",
  ].join("\n");

  const { output, meta } = await generateStructured({
    module: "study-guide-writer",
    promptVersion: PROMPT_VERSION,
    tier: "smart",
    instructions: SYSTEM_PROMPT,
    prompt,
    schema: generatedStudyGuideSchema,
    schemaName: "StudyGuide",
    schemaDescription: "How to study one step of the learner's path.",
    maxOutputTokens: 4_000,
    timeoutMs: 90_000,
    abortSignal: input.abortSignal,
  });
  return { guide: output, meta };
}
