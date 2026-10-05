import type { AssessmentResponse } from "@/lib/assessment-response";
import type { AnswerGrade, SkillJudgement } from "@/server/ai/schemas";

/**
 * Turning assessment answers into skill evidence (PRD §10). Pure: no database, no model.
 *
 * The model only ever judges the quality of a written answer. Everything else is decided here:
 * multiple choice is marked against the stored key, "I don't know" and blanks score zero, and the
 * item's difficulty decides how much any answer says about ability.
 */

/** Bump when the rules below change, so stored evaluations stay traceable. */
export const GRADING_VERSION = "g1";

export type Verdict = "strong" | "pass" | "partial" | "fail";

/** How good an answer was, for the learner. Difficulty doesn't change it. */
export function verdictFor(score: number): Verdict {
  if (score >= 0.85) return "strong";
  if (score >= 0.6) return "pass";
  if (score >= 0.3) return "partial";
  return "fail";
}

/**
 * What one answer says about ability, given how hard the item was. A right answer to a recall
 * question proves less than a right answer to a transfer problem, and a wrong answer to a hard
 * item costs less than a wrong answer to an easy one:
 *
 *   difficulty 1: 0.00 (wrong) to 0.60 (perfect)
 *   difficulty 3: 0.20 to 0.80
 *   difficulty 5: 0.40 to 1.00
 */
export function demonstratedAbility(difficulty: number, quality: number): number {
  const level = Math.min(5, Math.max(1, Math.round(difficulty)));
  const floor = 0.1 * (level - 1);
  const ceiling = 0.5 + 0.1 * level;
  return round(floor + clamp01(quality) * (ceiling - floor));
}

/**
 * How much one observation should count. A right multiple-choice answer could be a guess (one in
 * four), so it counts for less than a wrong one. An honest "I don't know" is good evidence of a gap.
 */
export const CONFIDENCE = {
  choiceRight: 0.45,
  choiceWrong: 0.6,
  dontKnow: 0.6,
  writtenMin: 0.2,
  writtenMax: 0.9,
} as const;

export type GradingItem = {
  id: string;
  difficulty: number;
  question: string;
  options: string[] | null;
  correctOption: number | null;
  skillSlugs: string[];
};

export type ItemGrade = {
  itemId: string;
  /** Quality of the answer, 0 to 1. */
  score: number;
  verdict: Verdict;
  answer: "choice" | "text" | "unknown" | "blank";
  gradedBy: "rules" | "model";
  /** For the learner: what was right and what was missing. Written answers only. */
  feedback: string | null;
  misconception: string | null;
  /** Per-skill evidence, with difficulty already applied to the scores. */
  judgements: SkillJudgement[];
};

/**
 * Marks an answer without the model: multiple choice against the key, and "I don't know" or a
 * blank as zero. Returns null for a written answer, which the Skill Evaluator grades.
 */
export function gradeByRules(item: GradingItem, response: AssessmentResponse | undefined): ItemGrade | null {
  const isChoiceItem = item.options !== null && item.correctOption !== null;

  if (response?.kind === "unknown") return zero(item, "unknown");
  if (!response || (response.kind === "text" && response.text.trim() === "")) return zero(item, "blank");
  // A written answer to a choice item, or a choice on a written item, can't come from the player.
  if (response.kind === "text" && isChoiceItem) return zero(item, "blank");
  if (response.kind === "choice" && !isChoiceItem) return zero(item, "blank");
  if (response.kind === "text") return null;

  const right = response.option === item.correctOption;
  const evidence = `${right ? "Chose the right answer" : "Chose a wrong answer"}: ${snippet(item.question)}`;
  return {
    itemId: item.id,
    score: right ? 1 : 0,
    verdict: right ? "strong" : "fail",
    answer: "choice",
    gradedBy: "rules",
    feedback: null,
    misconception: null,
    judgements: item.skillSlugs.map((skill) => ({
      skill,
      score: demonstratedAbility(item.difficulty, right ? 1 : 0),
      confidence: right ? CONFIDENCE.choiceRight : CONFIDENCE.choiceWrong,
      evidence,
    })),
  };
}

/** A written answer graded by the Skill Evaluator, with difficulty applied to its skill scores. */
export function gradeFromModel(item: GradingItem, grade: AnswerGrade): ItemGrade {
  return {
    itemId: item.id,
    score: round(clamp01(grade.score)),
    verdict: verdictFor(grade.score),
    answer: "text",
    gradedBy: "model",
    feedback: grade.feedback,
    misconception: grade.misconception,
    judgements: grade.skills.map((judgement) => ({
      ...judgement,
      score: demonstratedAbility(item.difficulty, judgement.score),
      confidence: round(
        Math.min(CONFIDENCE.writtenMax, Math.max(CONFIDENCE.writtenMin, clamp01(judgement.confidence))),
      ),
    })),
  };
}

/** The attempt's overall verdict: the mean answer quality. Unanswered items count as zero. */
export function overallScore(grades: readonly ItemGrade[]): number {
  if (grades.length === 0) return 0;
  return round(grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length);
}

function zero(item: GradingItem, answer: "unknown" | "blank"): ItemGrade {
  const evidence = `${answer === "unknown" ? "Said “I don’t know”" : "Left it unanswered"}: ${snippet(item.question)}`;
  return {
    itemId: item.id,
    score: 0,
    verdict: "fail",
    answer,
    gradedBy: "rules",
    feedback: null,
    misconception: null,
    judgements: item.skillSlugs.map((skill) => ({
      skill,
      score: demonstratedAbility(item.difficulty, 0),
      confidence: CONFIDENCE.dontKnow,
      evidence,
    })),
  };
}

/** The start of a question, cut at a word, for evidence summaries. */
export function snippet(question: string, max = 80): string {
  const flat = question.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return `“${flat}”`;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `“${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, "")}…”`;
}

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
const round = (value: number) => Math.round(value * 1000) / 1000;
