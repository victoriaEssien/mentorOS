import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import {
  evaluation,
  learningPath,
  learningPathItem,
  mission,
  missionSkill,
  missionSubmission,
  skill,
  userTrack,
} from "@/db/schema";
import { buildLearnerContext } from "@/server/ai/context";
import {
  generateMission,
  PROMPT_VERSION,
  type GenerateMissionInput,
} from "@/server/ai/modules/mission-generator";
import { getPrerequisiteEdges, getTrackSkills } from "@/server/queries/skills";

import { planDifficulty, type Outcome } from "./difficulty";
import { blockedSkills } from "./readiness";

export type Cadence = "daily" | "weekly";

const IN_PLAY = ["assigned", "in_progress", "submitted"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/** There is no current path item to write a mission for: plan a path first. */
export class NoPathError extends Error {
  constructor() {
    super("No current path item");
    this.name = "NoPathError";
  }
}

/** The mission in play for this cadence, if any. */
export async function getMissionInPlay(userId: string, cadence: Cadence) {
  const [row] = await db
    .select({ id: mission.id })
    .from(mission)
    .where(
      and(eq(mission.userId, userId), eq(mission.cadence, cadence), inArray(mission.status, [...IN_PLAY])),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Assigns the learner's next mission (PRD §13, §17): one practical task for the current path item,
 * pitched by planDifficulty from how their recent missions on that skill went. If a mission of
 * this cadence is already in play it is returned instead, so missions never stack up.
 */
export async function assignMission(
  userId: string,
  cadence: Cadence,
  now: Date = new Date(),
): Promise<{ missionId: string; created: boolean }> {
  const inPlay = await getMissionInPlay(userId, cadence);
  if (inPlay) return { missionId: inPlay.id, created: false };

  const { input, pathItemId, difficulty, idBySlug } = await missionInput(userId, cadence);
  const { mission: generated, meta } = await generateMission(input);

  const skillIds = generated.skills.flatMap((slug) => idBySlug.get(slug) ?? []);
  const missionId = crypto.randomUUID();

  try {
    await db.batch([
      db.insert(mission).values({
        id: missionId,
        userId,
        pathItemId,
        type: generated.type,
        cadence,
        title: generated.title,
        objective: generated.objective,
        reason: generated.reason,
        instructions: generated.instructions,
        requiredKnowledge: generated.requiredKnowledge,
        deliverable: generated.deliverable,
        evaluationCriteria: generated.evaluationCriteria,
        resources: generated.resources.map(({ url, note, ...resource }) => ({
          ...resource,
          ...(url ? { url } : {}),
          ...(note ? { note } : {}),
        })),
        estimatedMinutes: generated.estimatedMinutes,
        difficulty,
        dueAt: new Date(now.getTime() + (cadence === "daily" ? DAY_MS : 7 * DAY_MS)),
        generatedBy: `${meta.model}/${PROMPT_VERSION}`,
        createdAt: now,
      }),
      ...(skillIds.length > 0
        ? [db.insert(missionSkill).values(skillIds.map((skillId) => ({ missionId, skillId })))]
        : []),
    ]);
  } catch (error) {
    // Another request assigned one first: hand back that one.
    if (isUniqueViolation(error)) {
      const winner = await getMissionInPlay(userId, cadence);
      if (winner) return { missionId: winner.id, created: false };
    }
    throw error;
  }

  console.info(
    JSON.stringify({
      event: "mission.assigned",
      missionId,
      cadence,
      type: generated.type,
      difficulty,
      mode: input.difficulty.mode,
    }),
  );
  return { missionId, created: true };
}

/**
 * What the mission generator sees for the current path item: the learner's record, the skills a
 * mission may touch, recent missions on that skill, and the difficulty planDifficulty chose.
 * Separate from assignMission so a model change can be checked against exactly the input
 * production builds.
 */
export async function missionInput(
  userId: string,
  cadence: Cadence,
): Promise<{
  input: GenerateMissionInput;
  pathItemId: string;
  difficulty: number;
  idBySlug: Map<string, string>;
}> {
  const [current] = await db
    .select({
      id: learningPathItem.id,
      title: learningPathItem.title,
      reason: learningPathItem.reason,
      skillId: learningPathItem.skillId,
      skillSlug: skill.slug,
    })
    .from(learningPathItem)
    .innerJoin(
      learningPath,
      and(
        eq(learningPath.id, learningPathItem.pathId),
        eq(learningPath.userId, userId),
        isNull(learningPath.archivedAt),
      ),
    )
    .leftJoin(skill, eq(skill.id, learningPathItem.skillId))
    .where(eq(learningPathItem.status, "current"))
    .limit(1);
  if (!current) throw new NoPathError();

  const tracks = await db
    .select({ id: userTrack.trackId })
    .from(userTrack)
    .where(eq(userTrack.userId, userId));
  const [context, trackSkills, edges, history] = await Promise.all([
    buildLearnerContext(userId),
    getTrackSkills(tracks.map((t) => t.id)),
    getPrerequisiteEdges(),
    current.skillId ? missionHistory(userId, current.skillId) : Promise.resolve([]),
  ]);

  const estimates = new Map(context.skills.map((s) => [s.slug, s]));
  const blocked = new Set(
    blockedSkills(
      trackSkills.map((s) => s.slug),
      edges,
      estimates,
    ).map((b) => b.skill),
  );
  const allowed = trackSkills.filter((s) => !blocked.has(s.slug) || s.slug === current.skillSlug);

  // A skill nothing has measured yet starts gently rather than at the middle.
  const ability = current.skillSlug ? (estimates.get(current.skillSlug)?.ability ?? 0.3) : 0.5;
  const difficulty = planDifficulty({
    ability,
    recentOutcomes: history.flatMap((h) => (h.outcome ? [h.outcome] : [])),
    lastDifficulty: history[0]?.difficulty ?? null,
  });

  return {
    pathItemId: current.id,
    difficulty: difficulty.difficulty,
    idBySlug: new Map(allowed.map((s) => [s.slug, s.id])),
    input: {
      context,
      cadence,
      pathItem: { title: current.title, reason: current.reason, skill: current.skillSlug },
      difficulty: { level: difficulty.difficulty, mode: difficulty.mode, reason: difficulty.reason },
      allowedSkills: allowed.map((s) => ({ slug: s.slug, name: s.name })),
      recentMissions: history.map((h) => ({ title: h.title, outcome: h.outcome })),
    },
  };
}

/** Recent missions on a skill, newest first, with each one's latest evaluated outcome. */
async function missionHistory(userId: string, skillId: string) {
  const rows = await db
    .select({
      id: mission.id,
      title: mission.title,
      difficulty: mission.difficulty,
      outcome: evaluation.outcome,
      evaluatedAt: evaluation.createdAt,
    })
    .from(mission)
    .innerJoin(missionSkill, and(eq(missionSkill.missionId, mission.id), eq(missionSkill.skillId, skillId)))
    .leftJoin(missionSubmission, eq(missionSubmission.missionId, mission.id))
    .leftJoin(evaluation, eq(evaluation.submissionId, missionSubmission.id))
    .where(eq(mission.userId, userId))
    .orderBy(desc(mission.createdAt), desc(evaluation.createdAt))
    .limit(20);

  const byMission = new Map<string, { title: string; difficulty: number | null; outcome: Outcome | null }>();
  for (const row of rows) {
    if (!byMission.has(row.id)) {
      byMission.set(row.id, { title: row.title, difficulty: row.difficulty, outcome: row.outcome });
    }
  }
  return [...byMission.values()].slice(0, 5);
}

export class MissionNotFoundError extends Error {
  constructor() {
    super("Mission not found");
    this.name = "MissionNotFoundError";
  }
}

/** Starting: the learner has opened the mission and is working on it. */
export async function startMission(userId: string, missionId: string): Promise<void> {
  await moveMission(userId, missionId, ["assigned"], "in_progress");
}

/**
 * Skipping frees the slot for a different mission. It isn't evidence either way: a skipped
 * mission says nothing about what the learner can do.
 */
export async function skipMission(userId: string, missionId: string): Promise<void> {
  await moveMission(userId, missionId, ["assigned", "in_progress"], "skipped");
}

/** Moves a mission the learner owns between states; doing nothing if it's already moved on. */
async function moveMission(
  userId: string,
  missionId: string,
  from: (typeof mission.$inferSelect)["status"][],
  to: (typeof mission.$inferSelect)["status"],
) {
  const [row] = await db
    .select({ status: mission.status })
    .from(mission)
    .where(and(eq(mission.id, missionId), eq(mission.userId, userId)))
    .limit(1);
  if (!row) throw new MissionNotFoundError();
  if (!from.includes(row.status)) return;

  await db
    .update(mission)
    .set({ status: to })
    .where(and(eq(mission.id, missionId), eq(mission.userId, userId), inArray(mission.status, from)));
}
