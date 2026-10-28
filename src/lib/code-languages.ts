/**
 * The languages learners write in, and how a program's output is compared with what a test
 * expects. Shared by the runner (server) and the editor (client).
 */

export const CODE_LANGUAGES = ["python", "typescript", "go", "rust", "cpp", "java"] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const CODE_LANGUAGE_LABEL: Record<CodeLanguage, string> = {
  python: "Python",
  typescript: "TypeScript",
  go: "Go",
  rust: "Rust",
  cpp: "C++",
  java: "Java",
};

/** Question types answered with code that runs against tests (the rest are written answers). */
export const TESTED_ITEM_TYPES: readonly string[] = ["program", "algorithm", "fix_bug"];

/** A program's input on stdin and what it should print. */
export type TestCase = { input: string; output: string };

/**
 * Output as a test sees it: line endings unified, trailing spaces on each line and trailing blank
 * lines dropped. Everything else, including leading spaces, has to match.
 */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n+$/, "");
}

export function sameOutput(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}
