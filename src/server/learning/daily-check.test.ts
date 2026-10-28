import { describe, expect, it } from "vitest";

import type { GeneratedCodingQuestion } from "@/server/ai/schemas";

import { checkQuestion, type RunTests } from "./daily-check";

const example = (n: number) => ({ input: `${n}\n`, output: `${n * 2}\n` });

const question = (overrides: Partial<GeneratedCodingQuestion> = {}): GeneratedCodingQuestion => ({
  title: "Double it",
  question: "Read n, print 2n.",
  code: "STARTER",
  solution: "SOLUTION",
  examples: [example(1), example(2)],
  tests: [3, 4, 5, 6, 7].map(example),
  expected: "Multiply by two.",
  gradingNotes: "",
  ...overrides,
});

/** A fake runner: each program passes the inputs its rule accepts. */
function runner(rules: Record<string, (input: string) => boolean | "compile-error">): RunTests {
  return async (_language, code, tests) => {
    const rule = rules[code] ?? (() => false);
    if (tests.some((test) => rule(test.input) === "compile-error")) {
      return { compileError: "error: expected ;", cases: [] };
    }
    return {
      compileError: null,
      cases: tests.map((test) => ({
        passed: rule(test.input) === true,
        stdout: "",
        exitCode: 0,
        timedOut: false,
      })),
    };
  };
}

describe("checkQuestion", () => {
  it("keeps only the hidden tests the reference solution passes", async () => {
    const run = runner({ SOLUTION: (input) => input !== "7\n", STARTER: () => false });
    const checked = await checkQuestion("algorithm", "go", question(), run);
    expect(checked).toMatchObject({ ok: true });
    if (checked.ok) {
      expect(checked.tests.map((t) => t.input)).toEqual(["3\n", "4\n", "5\n", "6\n"]);
      expect(checked.examples).toHaveLength(2);
    }
  });

  it("rejects a question whose solution fails an example or too many hidden tests", async () => {
    const failsExample = runner({ SOLUTION: (input) => input !== "1\n" });
    expect(await checkQuestion("program", "rust", question(), failsExample)).toMatchObject({ ok: false });

    const failsMost = runner({ SOLUTION: (input) => ["1\n", "2\n", "3\n"].includes(input) });
    expect(await checkQuestion("program", "rust", question(), failsMost)).toEqual({
      ok: false,
      reason: "the reference solution passed only 1 hidden tests",
    });
  });

  it("rejects starter code that doesn't compile", async () => {
    const run = runner({ SOLUTION: () => true, STARTER: () => "compile-error" });
    const checked = await checkQuestion("program", "cpp", question(), run);
    expect(checked.ok).toBe(false);
  });

  it("rejects a bug that no test catches", async () => {
    const run = runner({ SOLUTION: () => true, STARTER: () => true });
    expect(await checkQuestion("fix_bug", "java", question(), run)).toEqual({
      ok: false,
      reason: "the buggy program passed every test, so no test catches the bug",
    });
    const caught = runner({ SOLUTION: () => true, STARTER: (input) => input !== "5\n" });
    expect(await checkQuestion("fix_bug", "java", question(), caught)).toMatchObject({ ok: true });
  });

  it("takes a predict-the-output answer from two identical runs", async () => {
    const printing =
      (outputs: string[]): RunTests =>
      async () => ({
        compileError: null,
        cases: outputs.map((stdout) => ({ passed: false, stdout, exitCode: 0, timedOut: false })),
      });
    const ask = question({ solution: null, examples: [], tests: [] });

    expect(await checkQuestion("predict_output", "go", ask, printing(["3\n1\n", "3\n1\n"]))).toEqual({
      ok: true,
      examples: [],
      tests: [],
      output: "3\n1\n",
    });
    expect(await checkQuestion("predict_output", "go", ask, printing(["1\n", "2\n"]))).toMatchObject({
      ok: false,
    });
    expect(await checkQuestion("predict_output", "go", ask, printing(["", ""]))).toMatchObject({ ok: false });
  });
});
