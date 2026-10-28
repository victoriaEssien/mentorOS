import type { CodeLanguage } from "@/lib/code-languages";

import { planDifficulty, type Outcome } from "./difficulty";

/**
 * Which five questions today's coding set asks: one of each kind, each in a language and on a
 * skill chosen here in plain code, so the generator is told exactly what to write. Pure and
 * deterministic for a given day and record.
 *
 * Languages rotate by day: the four the learner is picking up (Go, Rust, C++, Java) each appear
 * once a day across the kinds that ask them to read or write a whole program, and the LeetCode-style
 * problem cycles through all six. Skills come from each kind's pool, weakest first, skipping the
 * ones the last few sets already asked about and any whose prerequisites aren't met yet.
 */

export const DAILY_KINDS = ["program", "algorithm", "fix_bug", "explain_code", "predict_output"] as const;
export type DailyKind = (typeof DAILY_KINDS)[number];

const NEW_LANGUAGES: readonly CodeLanguage[] = ["go", "rust", "cpp", "java"];
const ALGORITHM_LANGUAGES: readonly CodeLanguage[] = ["python", "go", "typescript", "rust", "java", "cpp"];

/** Where each kind's language sits in the day's rotation of the new languages. */
const NEW_LANGUAGE_OFFSET: Record<Exclude<DailyKind, "algorithm">, number> = {
  program: 0,
  fix_bug: 1,
  explain_code: 2,
  predict_output: 3,
};

const ALGORITHM_POOL = [
  "arrays-hashing",
  "two-pointers",
  "sliding-window",
  "stacks-queues",
  "linked-lists",
  "binary-search",
  "sorting",
  "trees",
  "tries",
  "heaps",
  "graphs",
  "advanced-graphs",
  "backtracking",
  "greedy",
  "intervals",
  "dynamic-programming",
  "bit-manipulation",
  "recursion",
];

/** The skills each kind can practise. A fix-the-bug question also always counts toward debugging. */
export const DAILY_POOLS: Record<DailyKind, readonly string[]> = {
  program: [
    "variables-control-flow",
    "functions",
    "error-handling",
    "arrays-hashing",
    "sorting",
    "stacks-queues",
  ],
  algorithm: ALGORITHM_POOL,
  fix_bug: [...ALGORITHM_POOL, "variables-control-flow", "functions", "error-handling"],
  explain_code: [
    ...ALGORITHM_POOL,
    "complexity",
    "concurrency",
    "memory-management",
    "async-programming",
    "compilers",
  ],
  predict_output: ["variables-control-flow", "functions", "memory-management", "recursion", "error-handling"],
};

export type SkillRecord = { ability: number; confidence: number };

export type PlannedQuestion = {
  kind: DailyKind;
  language: CodeLanguage;
  skill: string;
  difficulty: number;
};

/** Days since 1 January 1970 for a "YYYY-MM-DD" day: the rotation's clock. */
export function dayNumber(day: string): number {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

export function planDailySet({
  day,
  skills,
  blocked,
  recent,
  outcomes,
}: {
  /** The learner's local date, "YYYY-MM-DD". */
  day: string;
  /** Current estimates by skill slug; a skill with no evidence is simply absent. */
  skills: ReadonlyMap<string, SkillRecord>;
  /** Skills whose prerequisites aren't met yet. */
  blocked: ReadonlySet<string>;
  /** Skills the last few sets asked about, newest first. */
  recent: readonly string[];
  /** Recent daily outcomes per skill, most recent first. */
  outcomes: ReadonlyMap<string, { outcome: Outcome; difficulty: number }[]>;
}): PlannedQuestion[] {
  const n = dayNumber(day);
  const taken = new Set<string>();

  return DAILY_KINDS.map((kind) => {
    const language =
      kind === "algorithm"
        ? ALGORITHM_LANGUAGES[n % ALGORITHM_LANGUAGES.length]!
        : NEW_LANGUAGES[(n + NEW_LANGUAGE_OFFSET[kind]) % NEW_LANGUAGES.length]!;
    const skill = pickSkill(DAILY_POOLS[kind], { n, skills, blocked, recent, taken });
    taken.add(skill);

    const history = outcomes.get(skill) ?? [];
    const { difficulty } = planDifficulty({
      ability: skills.get(skill)?.ability ?? 0.3,
      recentOutcomes: history.map((entry) => entry.outcome),
      lastDifficulty: history[0]?.difficulty ?? null,
    });
    return { kind, language, skill, difficulty };
  });
}

/**
 * The pool's neediest skill: least measured and weakest first (an unmeasured skill counts as weak
 * and uncertain), never one already in today's set, preferring ones not asked about recently, and
 * never a blocked one unless the whole pool is blocked. Ties rotate with the day.
 */
function pickSkill(
  pool: readonly string[],
  {
    n,
    skills,
    blocked,
    recent,
    taken,
  }: {
    n: number;
    skills: ReadonlyMap<string, SkillRecord>;
    blocked: ReadonlySet<string>;
    recent: readonly string[];
    taken: ReadonlySet<string>;
  },
): string {
  const open = pool.filter((slug) => !taken.has(slug));
  const ready = open.filter((slug) => !blocked.has(slug));
  const fresh = ready.filter((slug) => !recent.includes(slug));
  const candidates = fresh.length > 0 ? fresh : ready.length > 0 ? ready : open;

  const need = (slug: string) => {
    const record = skills.get(slug);
    // Weak and uncertain both raise the need; confidence counts for less than ability.
    return 1 - (record?.ability ?? 0.3) + 0.5 * (1 - (record?.confidence ?? 0));
  };
  const rotated = candidates.map((slug, index) => ({
    slug,
    need: need(slug),
    order: (index + n) % candidates.length,
  }));
  rotated.sort((a, b) => b.need - a.need || a.order - b.order);
  return rotated[0]!.slug;
}
