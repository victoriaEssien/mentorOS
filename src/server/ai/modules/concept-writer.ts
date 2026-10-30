import "server-only";

import { generateStructured, type GenerationMeta } from "../generate";
import { writtenConceptSchema, type WrittenConcept } from "../schemas";

/**
 * Concept Writer
 *
 * Writes a concept once, the first time it's handed out: what to explain, the checklist every
 * explanation of it is graded against, a reference explanation to compare with, and official docs
 * for high-stakes themes. Stored and never rewritten, so grading stays consistent across reviews.
 * Does not write to the database.
 */

export const PROMPT_VERSION = "v2";

const SYSTEM_PROMPT = `
You write one concept for a software engineer's daily practice. They research it on their own and
then write an explanation, which is graded against your checklist. Your checklist is the standard
every explanation of this concept will ever be held to, so make it right.

- ask: a direct request, e.g. "Explain how a card payment settles: who is involved, what happens
  at authorization, capture and settlement, and why they're separate."
- checklist: 4 to 7 key points a strong explanation must make. Each states the mechanism (how and
  why it works), never just a term: "Authorization places a hold on the cardholder's funds without
  moving money" rather than "mentions authorization". One main idea per point, in one sentence:
  variants, exceptions and "it can also" asides belong in the reference, not the checklist.
  Together they cover what an interviewer at a top company would expect. Order them as the idea
  builds.
- reference: a reference explanation that hits every checklist point, 180 to 320 words, plain prose
  with one small concrete example. Accurate above all: if a detail varies by provider or version,
  say so rather than guess.
- sources: only for themes where you're given official docs: point to the most relevant of those,
  or to specific pages of the same docs you're sure exist. Set url to null if unsure. Otherwise empty.
- No em dashes.
`.trim();

export async function writeConcept(input: {
  theme: string;
  title: string;
  angle: string;
  officialDocs: { title: string; url: string }[];
  abortSignal?: AbortSignal;
}): Promise<{ concept: WrittenConcept; meta: GenerationMeta }> {
  const prompt = [
    `THEME: ${input.theme}`,
    `CONCEPT: ${input.title}`,
    `A good explanation covers: ${input.angle}`,
    ...(input.officialDocs.length > 0
      ? [
          "",
          "OFFICIAL DOCS FOR THIS THEME (a wrong lesson here is costly; keep to what they say)",
          ...input.officialDocs.map((doc) => `- ${doc.title}: ${doc.url}`),
        ]
      : []),
  ].join("\n");

  const { output, meta } = await generateStructured({
    module: "concept-writer",
    promptVersion: PROMPT_VERSION,
    tier: "smart",
    instructions: SYSTEM_PROMPT,
    prompt,
    schema: writtenConceptSchema,
    schemaName: "Concept",
    schemaDescription: "A concept with its grading checklist and reference explanation.",
    maxOutputTokens: 4_000,
    timeoutMs: 90_000,
    abortSignal: input.abortSignal,
  });
  return { concept: output, meta };
}
