import "server-only";

import { CODE_LANGUAGE_LABEL, type CodeLanguage } from "@/lib/code-languages";

import { generateStructured, type GenerationMeta } from "../generate";
import type { ModelTier } from "../provider";
import { generatedCodingQuestionSchema, type GeneratedCodingQuestion } from "../schemas";

/**
 * Coding Question Writer
 *
 * Writes one question of the daily coding set: the kind, language, skill and difficulty are
 * decided in code (src/server/learning/daily-plan.ts). Questions with tests come with a reference
 * solution, so the caller can run both and keep only tests the solution passes. Does not write to
 * the database.
 */

export const PROMPT_VERSION = "v2";

export type CodingKind = "program" | "algorithm" | "fix_bug" | "explain_code" | "predict_output";

const SYSTEM_PROMPT = `
You write one question for mentorOS's daily coding set, which trains a software engineer toward
the interview bar at top companies (FAANG, the AI labs). Pitch it exactly at the difficulty given:
1 is a warm-up, 3 is a solid interview question, 5 is a hard one they haven't seen.

Every program reads all of its input from stdin and writes its answer to stdout, nothing else: no
prompts, no extra logging, no files, no network, standard library only. Output is compared line by
line after trimming trailing spaces, so make it unambiguous: no floating point unless rounded to a
stated number of places, and a single correct output for each input.

Language rules:
- Go: package main with func main. Read with bufio.
- Rust: fn main, std only, edition 2021. Read all of stdin with std::io::Read.
- C++: C++20, one file, int main. Fast I/O is fine.
- Java: a public class named Main with main. Use BufferedReader.
- Python: Python 3. Read with sys.stdin.
- TypeScript: run by Node directly, not type-checked. Read with readFileSync(0, "utf8") from "node:fs".

By kind:
- program: "write a program that ..." A realistic small task (parsing, aggregating, simulating,
  transforming data) that practises the skill. code is a starter file that compiles and runs: it
  reads the input in the stated format and calls one function marked TODO that they write.
  solution is the full program.
- algorithm: a LeetCode-style problem on the skill, framed with stdin and stdout. Name the
  constraints (sizes, value ranges) so the intended complexity is clear. code is the same kind of
  starter: input parsing done, one function to write. solution is an optimal program.
- fix_bug: a short program (20 to 50 lines) that should do what the question says but has one or
  two realistic bugs (an off-by-one, a wrong condition, overflow, mutation through an alias, a
  missed edge case). Don't mark the bugs or hint at them in comments. code is the buggy program;
  solution is the same program, fixed with the smallest change. At least one hidden test must fail
  on the buggy program.
- explain_code: 15 to 40 lines that use the skill in a non-obvious way. The question asks them to
  explain what it does, why it works, and its time and space complexity (or the specific thing
  worth explaining, such as why it can deadlock). examples and tests are empty; solution is null.
- predict_output: a program of at most 30 lines, with no input, that prints 2 to 6 short lines and
  turns on a language rule worth knowing for the skill (evaluation order, integer division and
  overflow, copying versus aliasing, shadowing, recursion order, how errors propagate). It must be
  deterministic: no randomness, time, threads, hash or map iteration order, or undefined behaviour.
  The question is "What does this program print?". examples and tests are empty; solution is null.

Tests: examples are 2 or 3 small cases shown to them; tests are 6 to 10 hidden cases including the
edge cases (empty or minimal input, duplicates, extremes of the constraints, the trap the skill is
about). Compute every expected output by working it through carefully; they will be checked by
running your solution.

The question is shown as plain text with \`inline code\` and line breaks only: no code fences, no
headings, no tables. State the input format, output format and constraints in it, but never the
examples: they're shown separately.

expected: what a strong answer contains, including the approach and its time and space
complexity. gradingNotes: how to tell strong from partial from wrong. No em dashes anywhere.
`.trim();

const TIER: Record<CodingKind, ModelTier> = {
  program: "smart",
  algorithm: "smart",
  fix_bug: "smart",
  // Explaining and predicting need no tests; a predict answer comes from running the code.
  explain_code: "fast",
  predict_output: "fast",
};

export type WriteCodingQuestionInput = {
  kind: CodingKind;
  language: CodeLanguage;
  skill: { slug: string; name: string; description: string | null };
  difficulty: number;
  /** Titles of recent questions on this skill, so it doesn't repeat itself. */
  recentTitles: string[];
  /** Why the last attempt was thrown away, when this is a retry. */
  retryReason?: string;
  abortSignal?: AbortSignal;
};

export async function writeCodingQuestion(
  input: WriteCodingQuestionInput,
): Promise<{ question: GeneratedCodingQuestion; meta: GenerationMeta }> {
  const prompt = [
    "QUESTION TO WRITE",
    `Kind: ${input.kind}.`,
    `Language: ${CODE_LANGUAGE_LABEL[input.language]}.`,
    `Skill: ${input.skill.name} (${input.skill.slug})${input.skill.description ? `: ${input.skill.description}` : ""}.`,
    `Difficulty: ${input.difficulty} of 5.`,
    ...(input.recentTitles.length > 0
      ? ["", "RECENT QUESTIONS ON THIS SKILL (don't repeat them)", ...input.recentTitles.map((t) => `- ${t}`)]
      : []),
    ...(input.retryReason ? ["", `A previous attempt was rejected: ${input.retryReason}. Fix that.`] : []),
  ].join("\n");

  const { output, meta } = await generateStructured({
    module: "coding-question-writer",
    promptVersion: PROMPT_VERSION,
    tier: TIER[input.kind],
    instructions: SYSTEM_PROMPT,
    prompt,
    schema: generatedCodingQuestionSchema,
    schemaName: "CodingQuestion",
    schemaDescription: "One coding question with starter code, a reference solution and tests.",
    maxOutputTokens: 8_000,
    timeoutMs: 120_000,
    abortSignal: input.abortSignal,
  });
  return { question: output, meta };
}
