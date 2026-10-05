import type { GeneratedAssessmentItem } from "../schemas";

/**
 * Checks the Assessment Generator's output against what the app can actually use. The schema
 * guarantees shape; this guarantees meaning:
 *
 * - skills must come from the allowed list (the model never adds skills to the taxonomy)
 * - multiple choice needs at least two options and a correct index inside them; otherwise the item
 *   becomes an open question rather than being graded against a wrong key
 * - difficulty stays within 1..5
 */
export function sanitizeAssessmentItems(
  items: readonly GeneratedAssessmentItem[],
  allowedSlugs: ReadonlySet<string>,
): { items: GeneratedAssessmentItem[]; dropped: number } {
  const kept: GeneratedAssessmentItem[] = [];

  for (const item of items) {
    const skills = [...new Set(item.skills.map((slug) => slug.trim().toLowerCase()))].filter((slug) =>
      allowedSlugs.has(slug),
    );
    if (skills.length === 0 || item.prompt.question.trim().length === 0) continue;

    const options = item.prompt.options?.map((option) => option.trim()).filter(Boolean) ?? null;
    const correct = item.rubric.correctOption;
    const validChoice =
      options !== null && options.length >= 2 && correct !== null && correct >= 0 && correct < options.length;

    kept.push({
      ...item,
      skills,
      difficulty: Math.min(5, Math.max(1, Math.round(item.difficulty))),
      prompt: { ...item.prompt, options: validChoice ? options : null },
      rubric: { ...item.rubric, correctOption: validChoice ? correct : null },
    });
  }

  return { items: kept, dropped: items.length - kept.length };
}
