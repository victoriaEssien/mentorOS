import "server-only";
import { and, desc, eq, inArray, isNotNull, notExists } from "drizzle-orm";

import { db } from "@/db";
import { assessment, assessmentAttempt, skill, userSkill } from "@/db/schema";
import { buildLearnerContext } from "@/server/ai/context";
import { AiGenerationError } from "@/server/ai/generate";
import { generateAssessment, PROMPT_VERSION } from "@/server/ai/modules/assessment-generator";

import { saveAssessment } from "./assessment-store";
import { isSurpriseCheckDue, pickRetentionChecks } from "./retention";

/**
 * Checks after the diagnostic (PRD §18, behaviour 8): a knowledge check the learner asks for, a
 * surprise check of skills that may have faded, and a reassessment where an estimate rests on too
 * little evidence. They run through the same player and grading as the diagnostic.
 */

export type CheckKind = "knowledge_check" | "surprise" | "reassessment";

const ITEM_COUNT: Record<CheckKind, number> = { knowledge_check: 5, surprise: 3, reassessment: 6 };

/** Below this, an estimate is a guess worth re-measuring rather than testing again as usual. */
export const REASSESS_BELOW_CONFIDENCE = 0.4;

/** An open (not handed in) check of this kind on exactly these skills, if there is one. */
async function findOpenCheck(userId: string, kind: CheckKind, skillIds?: readonly string[]) {
  const rows = await db
    .select({ id: assessment.id, targetSkillIds: assessment.targetSkillIds })
    .from(assessment)
    .where(
      and(
        eq(assessment.userId, userId),
        eq(assessment.kind, kind),
        notExists(
          db
            .select()
            .from(assessmentAttempt)
            .where(
              and(
                eq(assessmentAttempt.assessmentId, assessment.id),
                isNotNull(assessmentAttempt.completedAt),
              ),
            ),
        ),
      ),
    )
    .orderBy(desc(assessment.createdAt))
    .limit(5);

  const wanted = skillIds ? [...skillIds].sort().join() : null;
  return rows.find((row) => wanted === null || [...row.targetSkillIds].sort().join() === wanted)?.id ?? null;
}

/**
 * Writes a check on the given skills, or returns the open one already waiting on the same skills.
 * The kind changes how the questions are pitched (see the Assessment Generator).
 */
export async function createCheck(
  userId: string,
  kind: CheckKind,
  skillSlugs: readonly string[],
  reason: string,
): Promise<string> {
  const target = await db
    .select({ id: skill.id, slug: skill.slug, name: skill.name, description: skill.description })
    .from(skill)
    .where(inArray(skill.slug, [...skillSlugs]));
  if (target.length === 0) throw new Error("No such skills to check");

  const open = await findOpenCheck(
    userId,
    kind,
    target.map((s) => s.id),
  );
  if (open) return open;

  const context = await buildLearnerContext(userId);
  const { assessment: generated, meta } = await generateAssessment({
    context,
    kind,
    targetSkills: target.map(({ slug, name, description }) => ({ slug, name, description })),
    itemCount: ITEM_COUNT[kind],
    effort: "low",
  });
  if (generated.items.length === 0) {
    throw new AiGenerationError("assessment-generator", "the check had no usable questions");
  }

  const id = await saveAssessment({
    userId,
    kind,
    title: generated.title,
    reason,
    items: generated.items,
    skillIdBySlug: new Map(target.map((s) => [s.slug, s.id])),
    generatedBy: `${meta.model} assessment-generator@${PROMPT_VERSION}`,
    targetSkillIds: target.map((s) => s.id),
  });
  console.info(JSON.stringify({ event: "check.created", kind, assessmentId: id, skills: skillSlugs }));
  return id;
}

/**
 * The surprise check for today, if one is due (retention.ts decides when and what): written on the
 * learner's fading skills, or the one already waiting. Null on most days.
 */
export async function surpriseCheckIfDue(userId: string, now: Date = new Date()): Promise<string | null> {
  const open = await findOpenCheck(userId, "surprise");
  if (open) return open;

  const [last] = await db
    .select({ createdAt: assessment.createdAt })
    .from(assessment)
    .where(and(eq(assessment.userId, userId), eq(assessment.kind, "surprise")))
    .orderBy(desc(assessment.createdAt))
    .limit(1);
  if (!isSurpriseCheckDue({ userId, lastSurpriseAt: last?.createdAt ?? null, now })) return null;

  const estimates = await db
    .select({
      skillSlug: skill.slug,
      ability: userSkill.ability,
      confidence: userSkill.confidence,
      evidenceCount: userSkill.evidenceCount,
      lastEvidenceAt: userSkill.lastEvidenceAt,
    })
    .from(userSkill)
    .innerJoin(skill, eq(skill.id, userSkill.skillId))
    .where(and(eq(userSkill.userId, userId), isNotNull(userSkill.lastEvidenceAt)));

  const picked = pickRetentionChecks(
    estimates.map((e) => ({ ...e, lastEvidenceAt: e.lastEvidenceAt! })),
    now,
    2,
  );
  if (picked.length === 0) return null;

  return createCheck(
    userId,
    "surprise",
    picked.map((p) => p.skillSlug),
    "A short check that something you learned a while ago has stuck. No warning, on purpose.",
  );
}

/**
 * A check on one skill the learner asked for. When the estimate rests on too little evidence it is
 * pitched as a reassessment instead.
 */
export async function checkOnSkill(
  userId: string,
  skillSlug: string,
): Promise<{ assessmentId: string; name: string }> {
  const [estimate] = await db
    .select({ name: skill.name, confidence: userSkill.confidence })
    .from(skill)
    .leftJoin(userSkill, and(eq(userSkill.skillId, skill.id), eq(userSkill.userId, userId)))
    .where(eq(skill.slug, skillSlug))
    .limit(1);
  if (!estimate) throw new Error(`No skill "${skillSlug}"`);

  const reassess = estimate.confidence !== null && estimate.confidence < REASSESS_BELOW_CONFIDENCE;
  const assessmentId = await createCheck(
    userId,
    reassess ? "reassessment" : "knowledge_check",
    [skillSlug],
    reassess
      ? `Your ${estimate.name} estimate rests on little evidence, so this checks it from angles you haven't seen.`
      : `You asked to be tested on ${estimate.name}.`,
  );
  return { assessmentId, name: estimate.name };
}
