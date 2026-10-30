import "server-only";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { evaluation, mission, missionSubmission, projectPost } from "@/db/schema";
import { themeBySlug } from "@/lib/themes";
import { draftProjectPost, PROMPT_VERSION } from "@/server/ai/modules/post-drafter";
import type { SubmissionEvaluation } from "@/server/ai/schemas";
import { take, type Limit } from "@/server/throttle";

import { tidyPost } from "./post-text";

/** A first draft and a few rewrites per project is plenty; each one is a model call. */
const DRAFTS_PER_PROJECT: Limit = { max: 4, perSeconds: 30 * 24 * 60 * 60 };

export class NotReviewedError extends Error {
  constructor() {
    super("The project hasn't been reviewed yet");
    this.name = "NotReviewedError";
  }
}

export class TooManyDraftsError extends Error {
  constructor() {
    super("Too many drafts for this project");
    this.name = "TooManyDraftsError";
  }
}

/**
 * Drafts (or redrafts) a reviewed project's posts for X and LinkedIn from what was built, what the
 * review found, and the learner's own reflection, and saves them.
 */
export async function draftPostForProject(userId: string, missionId: string) {
  const [row] = await db
    .select({
      title: mission.title,
      themeSlug: mission.themeSlug,
      stack: mission.stack,
      objective: mission.objective,
      reflection: missionSubmission.reflection,
      artifacts: missionSubmission.artifacts,
      outcome: evaluation.outcome,
      result: evaluation.result,
    })
    .from(mission)
    .innerJoin(missionSubmission, eq(missionSubmission.missionId, mission.id))
    .innerJoin(evaluation, eq(evaluation.submissionId, missionSubmission.id))
    .where(and(eq(mission.id, missionId), eq(mission.userId, userId)))
    .orderBy(desc(evaluation.createdAt))
    .limit(1);
  if (!row) throw new NotReviewedError();
  if (!(await take(`post-draft:${missionId}`, DRAFTS_PER_PROJECT))) throw new TooManyDraftsError();

  const review = row.result as SubmissionEvaluation;
  const { post, meta } = await draftProjectPost({
    theme: (row.themeSlug && themeBySlug(row.themeSlug)?.title) || "a project",
    title: row.title,
    stack: row.stack,
    objective: row.objective,
    outcome: row.outcome,
    strengths: review.strengths ?? [],
    weaknesses: review.weaknesses ?? [],
    learned: row.reflection?.learned ?? null,
    gotWrong: row.reflection?.gotWrong ?? null,
    repo: row.artifacts.find((a) => a.kind === "repo")?.url ?? row.artifacts[0]?.url ?? null,
  });
  const { linkedin, x } = tidyPost(post);
  const values = { linkedin, x, drewOn: post.drewOn, generatedBy: `${meta.model}/${PROMPT_VERSION}` };
  const [saved] = await db
    .insert(projectPost)
    .values({ userId, missionId, ...values })
    .onConflictDoUpdate({ target: projectPost.missionId, set: values })
    .returning();
  return saved!;
}
