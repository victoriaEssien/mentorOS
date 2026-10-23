import "server-only";
import { and, desc, eq, isNotNull, notExists } from "drizzle-orm";

import { db } from "@/db";
import { assessment, assessmentAttempt, track, userTrack } from "@/db/schema";
import { buildLearnerContext } from "@/server/ai/context";
import { AiGenerationError } from "@/server/ai/generate";
import { generateAssessment, PROMPT_VERSION } from "@/server/ai/modules/assessment-generator";
import { getTrackSkills } from "@/server/queries/skills";
import { release, take, type Limit } from "@/server/throttle";

import { saveAssessment } from "./assessment-store";
import { pickDiagnosticSkills, planDiagnosticChunks } from "./diagnostic-plan";

/**
 * One diagnostic write at a time per learner. Writing takes about 40 seconds; a retry in that
 * window (onboarding's request failed in the browser but kept going on the server) used to write,
 * and pay for, a second diagnostic.
 */
const DIAGNOSTIC_WRITE: Limit = { max: 1, perSeconds: 180 };
const WAIT_FOR_OTHER_WRITE_MS = 90_000;

/** The diagnostic the learner finished, if any. */
async function getFinishedDiagnosticId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: assessment.id })
    .from(assessment)
    .innerJoin(
      assessmentAttempt,
      and(eq(assessmentAttempt.assessmentId, assessment.id), isNotNull(assessmentAttempt.completedAt)),
    )
    .where(and(eq(assessment.userId, userId), eq(assessment.kind, "diagnostic")))
    .orderBy(desc(assessmentAttempt.completedAt))
    .limit(1);
  return row?.id ?? null;
}

/** The learner's diagnostic, finished or waiting for them. */
async function findDiagnostic(userId: string): Promise<string | null> {
  return (await getFinishedDiagnosticId(userId)) ?? (await getOpenDiagnosticId(userId));
}

/**
 * The learner's diagnostic that hasn't been completed yet. None once they've finished one: a
 * second written by an overlapping retry is never asked of them (withoutSupersededDiagnostics).
 */
export async function getOpenDiagnosticId(userId: string): Promise<string | null> {
  if (await getFinishedDiagnosticId(userId)) return null;
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
 * Returns the learner's diagnostic, writing one first if they have none (PRD §9). A request that
 * arrives while another is writing waits for that one instead of writing a second.
 */
export async function ensureDiagnostic(userId: string): Promise<string> {
  const existing = await findDiagnostic(userId);
  if (existing) return existing;

  const lock = `diagnostic-write:${userId}`;
  if (!(await take(lock, DIAGNOSTIC_WRITE))) return waitForDiagnostic(userId);
  try {
    return await writeDiagnostic(userId);
  } finally {
    // Done or failed, the next request may write: if this one failed, a retry shouldn't wait.
    await release(lock).catch(() => undefined);
  }
}

/** Waits for the diagnostic another request is writing, so a retry opens that one. */
async function waitForDiagnostic(userId: string): Promise<string> {
  const deadline = Date.now() + WAIT_FOR_OTHER_WRITE_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    const id = await findDiagnostic(userId);
    if (id) return id;
  }
  throw new Error("The diagnostic is still being written by another request.");
}

/**
 * Writes the diagnostic. Skills are picked deterministically across the learner's tracks; the
 * questions are written in parallel chunks so the learner waits for one model call, not four.
 */
async function writeDiagnostic(userId: string): Promise<string> {
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

  // Belt and braces: if one landed while these questions were being written, keep that one.
  const landed = await findDiagnostic(userId);
  if (landed) return landed;

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
