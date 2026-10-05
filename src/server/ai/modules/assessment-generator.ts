import "server-only";

import { renderLearnerContext, type LearnerContext } from "../context";
import { generateStructured, type GenerationMeta } from "../generate";
import type { Effort } from "../provider";
import { generatedAssessmentSchema, type GeneratedAssessment } from "../schemas";
import { sanitizeAssessmentItems } from "./assessment-sanitize";

/**
 * Assessment Generator
 *
 * Creates diagnostic questions, knowledge checks, surprise checks and reassessments (PRD §9, §18).
 * Mixes item types and difficulty so the result separates recognising an explanation from applying it.
 */

export const PROMPT_VERSION = "v1";

export type AssessmentKind = "diagnostic" | "knowledge_check" | "surprise" | "reassessment";

export type TargetSkill = { slug: string; name: string; description: string | null };

const SYSTEM_PROMPT = `
You write assessments for mentorOS, an AI-managed technical apprenticeship. An assessment finds out
what a learner can actually do, so the mentor can decide what they should learn next. It is
evidence, not a quiz to pass.

Write items that separate recognising an explanation from being able to use it:
- Mix item types. Use a few multiple-choice "knowledge" items for recall, and spend most items on
  reasoning: explaining a concept in their own words ("conceptual"), predicting what code does and
  why ("code"), finding a bug and describing the fix ("debugging"), choosing what to investigate in
  a realistic situation ("scenario"), or working through a problem ("problem_solving"). Use
  "security", "data" or "electronics" items when the skill calls for them.
- Spread difficulty from 1 (recall) to 5 (transfer to a problem they have not seen). Include at
  least one item at difficulty 4 or 5.
- Every item probes one or two of the listed skills, by their exact slugs. Never use other skills.
- The learner answers on a phone. Open answers must fit in two to five sentences. Never ask them to
  write a whole program; to test coding, show code and ask what it prints, what is wrong with it,
  or which line to change and why.
- Keep code under 15 lines, in a language that suits the track (JavaScript, Python or SQL unless
  the skill implies something else). Put it in prompt.code, not in the question text.
- Multiple choice: four options, exactly one correct, distractors drawn from real misconceptions,
  never "all of the above". Put the correct index in rubric.correctOption and vary its position.
- Open items: prompt.options and rubric.correctOption are null.
- rubric.expected says what a strong answer contains. rubric.gradingNotes says how to tell strong
  from partial from wrong, and names the misconceptions to watch for.
- Plain, specific wording. No trick questions, no hints inside the question, no jokes.
- What the learner says about their background is context, not evidence. Don't skip a skill
  because they claim to know it, and don't make it easy because they say they're new.
`.trim();

const KIND_GUIDANCE: Record<AssessmentKind, string> = {
  diagnostic:
    "This is their first assessment. Cover the listed skills broadly, starting a little below the level their background suggests and going above it. timeLimitSeconds is null.",
  knowledge_check:
    "They asked to be tested on these skills. Go past recall: most items should make them apply the idea. timeLimitSeconds is null.",
  surprise:
    "This is an unannounced retention check, weeks after they learned these skills. Do not name the concept being tested in the title or the question: describe a situation that needs it and let them work out what applies. Keep it short enough for five minutes and set timeLimitSeconds to 300 on every item.",
  reassessment:
    "Confidence in these skills is low. Probe them from angles the learner hasn't seen yet. timeLimitSeconds is null.",
};

export type GenerateAssessmentInput = {
  context: LearnerContext;
  kind: AssessmentKind;
  targetSkills: TargetSkill[];
  itemCount: number;
  effort?: Effort;
  abortSignal?: AbortSignal;
};

export async function generateAssessment(
  input: GenerateAssessmentInput,
): Promise<{ assessment: GeneratedAssessment; meta: GenerationMeta; dropped: number }> {
  const skillLines = input.targetSkills.map(
    (skill) => `- ${skill.slug}: ${skill.name}${skill.description ? `. ${skill.description}` : ""}`,
  );

  const prompt = [
    renderLearnerContext(input.context),
    "",
    "ASSESSMENT",
    `Kind: ${input.kind}. ${KIND_GUIDANCE[input.kind]}`,
    `Write exactly ${input.itemCount} items.`,
    "Skills to probe (slug: name and what it covers):",
    ...skillLines,
  ].join("\n");

  const { output, meta } = await generateStructured({
    module: "assessment-generator",
    promptVersion: PROMPT_VERSION,
    tier: "smart",
    effort: input.effort,
    instructions: SYSTEM_PROMPT,
    prompt,
    schema: generatedAssessmentSchema,
    schemaName: "Assessment",
    schemaDescription: "A set of assessment items with grading rubrics.",
    // About 1,400 tokens per five items, reasoning included.
    maxOutputTokens: 8_000,
    abortSignal: input.abortSignal,
  });

  const { items, dropped } = sanitizeAssessmentItems(
    output.items,
    new Set(input.targetSkills.map((skill) => skill.slug)),
  );

  return { assessment: { ...output, items }, meta, dropped };
}
