import "server-only";
import { and, eq, isNotNull, notExists } from "drizzle-orm";

import { db } from "@/db";
import { assessment, assessmentAttempt, track, userTrack } from "@/db/schema";
import { buildLearnerContext } from "@/server/ai/context";
import { AiGenerationError } from "@/server/ai/generate";
import { generateAssessment, PROMPT_VERSION } from "@/server/ai/modules/assessment-generator";
import { getTrackSkills } from "@/server/queries/skills";

import { saveAssessment } from "./assessment-store";
import { pickDiagnosticSkills, planDiagnosticChunks } from "./diagnostic-plan";

/** The learner's diagnostic that hasn't been completed yet, if any. */
export async function getOpenDiagnosticId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: assessment.id })
    .from(assessment)
    .where(
      and(
        eq(assessment.userId, userId),
        eq(assessment.kind, "diagnostic"),
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
    .limit(1);
  return row?.id ?? null;
}

/**
 * Returns the learner's open diagnostic, writing one first if needed (PRD §9). Skills are picked
 * deterministically across the learner's tracks; the questions are written in parallel chunks so
 * the learner waits for one model call, not four.
 */
export async function ensureDiagnostic(userId: string): Promise<string> {
  const existing = await getOpenDiagnosticId(userId);
  if (existing) return existing;

  const tracks = await db
    .select({ id: track.id, name: track.name })
    .from(userTrack)
    .innerJoin(track, eq(userTrack.trackId, track.id))
    .where(eq(userTrack.userId, userId))
    .orderBy(track.sortOrder);
  if (tracks.length === 0) throw new Error("Pick at least one track before the diagnostic.");

  const [context, candidates] = await Promise.all([
    buildLearnerContext(userId),
    getTrackSkills(tracks.map((t) => t.id)),
  ]);
  const skills = pickDiagnosticSkills(candidates);
  const skillIdBySlug = new Map(candidates.map((skill) => [skill.slug, skill.id]));

  const settled = await Promise.allSettled(
    planDiagnosticChunks(skills).map((chunk) =>
      generateAssessment({
        context,
        kind: "diagnostic",
        targetSkills: chunk.skills,
        itemCount: chunk.itemCount,
        effort: "low",
      }),
    ),
  );

  const succeeded = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  if (succeeded.length === 0 || succeeded.length < settled.length / 2) {
    const failure = settled.find((result) => result.status === "rejected");
    throw failure?.status === "rejected" && failure.reason instanceof Error
      ? failure.reason
      : new AiGenerationError("assessment-generator", "couldn't write the diagnostic");
  }

  const trackNames = tracks.map((t) => t.name);
  return saveAssessment({
    userId,
    kind: "diagnostic",
    title: `Diagnostic: ${trackNames.join(" and ")}`,
    reason: "Before planning anything, the mentor needs to see what you can already do.",
    items: succeeded.flatMap((result) => result.assessment.items),
    skillIdBySlug,
    generatedBy: `${succeeded[0].meta.model} assessment-generator@${PROMPT_VERSION}`,
    // Every picked skill, even one whose chunk failed: the diagnostic set out to probe it.
    targetSkillIds: skills.map((skill) => skill.id),
  });
}
