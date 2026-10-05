import "server-only";

import { db } from "@/db";
import { assessment, assessmentItem } from "@/db/schema";
import type { GeneratedAssessmentItem } from "@/server/ai/schemas";

export type AssessmentKind = (typeof assessment.$inferSelect)["kind"];

/**
 * Saves a generated assessment and its items in one transaction. Items are ordered easiest first,
 * so the learner warms up before the transfer problems.
 */
export async function saveAssessment({
  userId,
  kind,
  title,
  reason,
  items,
  skillIdBySlug,
  generatedBy,
  targetSkillIds,
}: {
  userId: string;
  kind: AssessmentKind;
  title: string;
  reason: string;
  items: readonly GeneratedAssessmentItem[];
  skillIdBySlug: ReadonlyMap<string, string>;
  generatedBy: string;
  /** What the assessment set out to probe; defaults to the skills its items cover. */
  targetSkillIds?: string[];
}): Promise<string> {
  const ordered = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.difficulty - b.item.difficulty || a.index - b.index)
    .map(({ item }) => item);
  const skillIdsOf = (item: GeneratedAssessmentItem) =>
    item.skills.flatMap((slug) => {
      const id = skillIdBySlug.get(slug);
      return id ? [id] : [];
    });

  const assessmentId = crypto.randomUUID();
  await db.batch([
    db.insert(assessment).values({
      id: assessmentId,
      userId,
      kind,
      title,
      reason,
      targetSkillIds: targetSkillIds ?? [...new Set(ordered.flatMap(skillIdsOf))],
      generatedBy,
    }),
    db.insert(assessmentItem).values(
      ordered.map((item, order) => ({
        assessmentId,
        type: item.type,
        order,
        prompt: item.prompt,
        rubric: item.rubric,
        skillIds: skillIdsOf(item),
        difficulty: item.difficulty,
        timeLimitSeconds: item.timeLimitSeconds,
      })),
    ),
  ]);
  return assessmentId;
}
