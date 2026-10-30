import "server-only";
import { and, count, desc, eq, inArray, lte } from "drizzle-orm";

import { db } from "@/db";
import { evaluation, mission, missionSubmission, themeRun } from "@/db/schema";
import { buildLearnerContext } from "@/server/ai/context";
import { generateMission, PROMPT_VERSION } from "@/server/ai/modules/mission-generator";
import { release, take, type Limit } from "@/server/throttle";

import { planDifficulty, type Outcome } from "./difficulty";
import { planStack, stackLabel } from "./mission-stack";
import { ensureThemeRun } from "./themes";

/**
 * Projects: one per theme, written by the app in a stack it picks and due when the theme ends. The
 * learner builds it their own way, hands in the repo, and it's reviewed against the brief. Stored
 * as missions of the weekly cadence.
 */

const IN_PLAY = ["assigned", "in_progress", "submitted"] as const;
const PROJECT_WRITE: Limit = { max: 1, perSeconds: 150 };

/**
 * Marks projects that ran out of time as expired: still not started or in progress at their due
 * time. Work already handed in never expires. Expired projects stay on record as missed. Checked
 * lazily whenever projects are looked at or written, and swept by the daily job. Without a userId
 * it sweeps everyone. Returns how many expired.
 */
export async function expireOverdueMissions(userId: string | null, now: Date = new Date()): Promise<number> {
  const expired = await db
    .update(mission)
    .set({ status: "expired" })
    .where(
      and(
        userId ? eq(mission.userId, userId) : undefined,
        inArray(mission.status, ["assigned", "in_progress"]),
        lte(mission.dueAt, now),
      ),
    )
    .returning({ id: mission.id });
  return expired.length;
}

/** The project in play, if any. */
export async function getProjectInPlay(userId: string) {
  const [row] = await db
    .select({ id: mission.id })
    .from(mission)
    .where(
      and(eq(mission.userId, userId), eq(mission.cadence, "weekly"), inArray(mission.status, [...IN_PLAY])),
    )
    .limit(1);
  return row ?? null;
}

/**
 * The project for the learner's current theme, written the first time it's asked for. A theme has
 * exactly one project, due when the theme ends; handing it in early doesn't start another. The
 * stack and difficulty are decided here in code; the Project Writer decides the build.
 */
export async function assignProject(
  userId: string,
  today: string,
  now: Date = new Date(),
): Promise<{ missionId: string; created: boolean }> {
  await expireOverdueMissions(userId, now);
  const { run, theme } = await ensureThemeRun(userId, today);
  if (run.missionId) return { missionId: run.missionId, created: false };

  // Only one project can be in play. Due times are midnight UTC, so east of UTC the last theme's
  // project can still be open for the first hours of the next theme: its theme is over, so close it.
  await db
    .update(mission)
    .set({ status: "expired" })
    .where(
      and(
        eq(mission.userId, userId),
        inArray(mission.status, ["assigned", "in_progress"]),
        inArray(
          mission.id,
          db
            .select({ id: themeRun.missionId })
            .from(themeRun)
            .where(and(eq(themeRun.userId, userId), lte(themeRun.endsOn, today))),
        ),
      ),
    );
  const open = await getProjectInPlay(userId);
  if (open) {
    const [owner] = await db
      .select({ id: themeRun.id })
      .from(themeRun)
      .where(eq(themeRun.missionId, open.id))
      .limit(1);
    if (owner) throw new Error("The last theme's project is still being reviewed.");
    // A project from before weekly themes stands as this theme's, rather than stacking a second.
    await db.update(themeRun).set({ missionId: open.id }).where(eq(themeRun.id, run.id));
    return { missionId: open.id, created: false };
  }

  const lock = `project-write:${run.id}`;
  if (!(await take(lock, PROJECT_WRITE))) {
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      const [again] = await db
        .select({ missionId: themeRun.missionId })
        .from(themeRun)
        .where(eq(themeRun.id, run.id));
      if (again?.missionId) return { missionId: again.missionId, created: false };
    }
    throw new Error("The project is still being written by another request.");
  }

  try {
    const [context, history, [given]] = await Promise.all([
      buildLearnerContext(userId),
      projectHistory(userId),
      db
        .select({ projects: count() })
        .from(mission)
        .where(and(eq(mission.userId, userId), eq(mission.cadence, "weekly"))),
    ]);
    const stack = planStack({
      given: Number(given?.projects ?? 0),
      technologiesUsed: context.background.technologiesUsed,
      side: theme.side,
    });
    const difficulty = planDifficulty({
      ability: 0.5,
      recentOutcomes: history.flatMap((h) => (h.outcome ? [h.outcome] : [])),
      lastDifficulty: history[0]?.difficulty ?? null,
    });

    const { mission: generated, meta } = await generateMission({
      context,
      theme: {
        title: theme.title,
        summary: theme.summary,
        project: theme.project,
        concepts: theme.concepts.map((c) => c.title),
        weeks: theme.weeks,
      },
      stack,
      difficulty: { level: difficulty.difficulty, mode: difficulty.mode, reason: difficulty.reason },
    });

    const missionId = crypto.randomUUID();
    await db.batch([
      db.insert(mission).values({
        id: missionId,
        userId,
        themeSlug: theme.slug,
        type: generated.type,
        cadence: "weekly",
        title: generated.title,
        objective: generated.objective,
        scenario: generated.scenario,
        reason: generated.reason,
        instructions: generated.instructions,
        requiredKnowledge: generated.requiredKnowledge,
        deliverable: generated.deliverable,
        acceptanceCriteria: generated.acceptanceCriteria,
        stretchGoal: generated.stretchGoal,
        stack: stackLabel(stack, generated.technology),
        evaluationCriteria: generated.evaluationCriteria,
        resources: generated.resources.map(({ url, note, ...resource }) => ({
          ...resource,
          ...(url ? { url } : {}),
          ...(note ? { note } : {}),
        })),
        estimatedMinutes: generated.estimatedMinutes,
        difficulty: difficulty.difficulty,
        // Due at the end of the theme's last day.
        dueAt: new Date(`${run.endsOn}T00:00:00Z`),
        generatedBy: `${meta.model}/${PROMPT_VERSION}`,
        createdAt: now,
      }),
      db.update(themeRun).set({ missionId }).where(eq(themeRun.id, run.id)),
    ]);

    console.info(
      JSON.stringify({
        event: "project.assigned",
        missionId,
        theme: theme.slug,
        difficulty: difficulty.difficulty,
        stack: stack.mode,
      }),
    );
    return { missionId, created: true };
  } finally {
    await release(lock).catch(() => undefined);
  }
}

/** Recent projects, newest first, with each one's latest evaluated outcome. */
async function projectHistory(userId: string) {
  const rows = await db
    .select({
      id: mission.id,
      difficulty: mission.difficulty,
      outcome: evaluation.outcome,
    })
    .from(mission)
    .leftJoin(missionSubmission, eq(missionSubmission.missionId, mission.id))
    .leftJoin(evaluation, eq(evaluation.submissionId, missionSubmission.id))
    .where(and(eq(mission.userId, userId), eq(mission.cadence, "weekly")))
    .orderBy(desc(mission.createdAt), desc(evaluation.createdAt))
    .limit(20);

  const byProject = new Map<string, { difficulty: number | null; outcome: Outcome | null }>();
  for (const row of rows) {
    if (!byProject.has(row.id)) byProject.set(row.id, { difficulty: row.difficulty, outcome: row.outcome });
  }
  return [...byProject.values()].slice(0, 5);
}

export class MissionNotFoundError extends Error {
  constructor() {
    super("Mission not found");
    this.name = "MissionNotFoundError";
  }
}

/** Starting: the learner has opened the project and is working on it. */
export async function startMission(userId: string, missionId: string): Promise<void> {
  await moveMission(userId, missionId, ["assigned"], "in_progress");
}

/** Skipping frees the slot for a different project. It shows as skipped, nothing more. */
export async function skipMission(userId: string, missionId: string): Promise<void> {
  await moveMission(userId, missionId, ["assigned", "in_progress"], "skipped");
}

/** Moves a project the learner owns between states; doing nothing if it's already moved on. */
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
