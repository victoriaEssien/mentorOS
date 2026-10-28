import type { CodeLanguage, TestCase } from "@/lib/code-languages";
import type { GeneratedCodingQuestion } from "@/server/ai/schemas";

import type { DailyKind } from "./daily-plan";

/**
 * Checks a written question by running it before the learner ever sees it, so a test the model got
 * wrong never marks a right answer wrong. Takes the runner as an argument to stay testable.
 *
 * - With tests: the reference solution must pass every example and enough hidden tests (the ones
 *   it fails are dropped), and the starter or buggy code must at least compile. A buggy program
 *   must fail at least one kept test, or the bug is never caught.
 * - Predict the output: the program runs twice; it must succeed, print something, and print the
 *   same thing both times. That output becomes the answer key.
 * - Explain the code: nothing to run.
 */

export type RunTests = (
  language: CodeLanguage,
  code: string,
  tests: TestCase[],
) => Promise<{
  compileError: string | null;
  cases: { passed: boolean; stdout: string; exitCode: number | null; timedOut: boolean }[];
}>;

export type CheckedQuestion =
  | { ok: true; examples: TestCase[]; tests: TestCase[]; output: string | null }
  | { ok: false; reason: string };

const MIN_HIDDEN = 4;

export async function checkQuestion(
  kind: DailyKind,
  language: CodeLanguage,
  question: GeneratedCodingQuestion,
  run: RunTests,
): Promise<CheckedQuestion> {
  if (kind === "explain_code") return { ok: true, examples: [], tests: [], output: null };

  if (kind === "predict_output") {
    const twice = await run(language, question.code, [
      { input: "", output: "" },
      { input: "", output: "" },
    ]);
    if (twice.compileError) {
      return { ok: false, reason: `the program didn't compile: ${clip(twice.compileError)}` };
    }
    const [first, second] = twice.cases;
    if (!first || !second || first.timedOut || first.exitCode !== 0) {
      return { ok: false, reason: "the program didn't run to completion" };
    }
    if (first.stdout.trim() === "") return { ok: false, reason: "the program printed nothing" };
    if (first.stdout !== second.stdout) {
      return { ok: false, reason: "the program printed different things on two runs" };
    }
    return { ok: true, examples: [], tests: [], output: first.stdout };
  }

  if (!question.solution) return { ok: false, reason: "there was no reference solution" };
  if (question.examples.length === 0) return { ok: false, reason: "there were no examples" };

  const all = [...question.examples, ...question.tests];
  const solved = await run(language, question.solution, all);
  if (solved.compileError) {
    return { ok: false, reason: `the reference solution didn't compile: ${clip(solved.compileError)}` };
  }
  const passing = all.filter((_, index) => solved.cases[index]?.passed);
  const examples = question.examples.filter((example) => passing.includes(example));
  const tests = question.tests.filter((test) => passing.includes(test));
  if (examples.length < question.examples.length) {
    return { ok: false, reason: "the reference solution failed one of the examples" };
  }
  if (tests.length < MIN_HIDDEN) {
    return { ok: false, reason: `the reference solution passed only ${tests.length} hidden tests` };
  }

  const given = await run(language, question.code, [...examples, ...tests]);
  if (given.compileError) {
    return { ok: false, reason: `the code given to the learner didn't compile: ${clip(given.compileError)}` };
  }
  if (kind === "fix_bug" && given.cases.every((result) => result.passed)) {
    return { ok: false, reason: "the buggy program passed every test, so no test catches the bug" };
  }
  return { ok: true, examples, tests, output: null };
}

function clip(text: string) {
  return text.length > 300 ? `${text.slice(0, 300)}...` : text;
}
