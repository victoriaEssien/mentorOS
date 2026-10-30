"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { knownTimeZone, TIME_ZONE_COOKIE, today } from "@/lib/local-time";
import { projectPostDraft, themeProject } from "@/server/learning/loop";
import { MissionNotFoundError, skipMission, startMission } from "@/server/learning/missions";
import { NotReviewedError, TooManyDraftsError } from "@/server/learning/project-post";
import { requireLearner } from "@/server/session";

const uuid = z.uuid();

export type NextProjectState = { error?: string };

/** Writes the current theme's project (or finds it) and opens it. */
export async function nextProjectAction(): Promise<NextProjectState> {
  const { user } = await requireLearner();
  const day = today(knownTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value));
  let missionId: string;
  try {
    ({ missionId } = await themeProject(user.id, day));
  } catch (error) {
    console.error(JSON.stringify({ event: "project.assign_failed", reason: String(error) }));
    return { error: "Writing your project didn't finish. Try again in a moment." };
  }
  redirect(`/projects/${missionId}`);
}

export async function startMissionAction(missionId: string): Promise<void> {
  const { user } = await requireLearner();
  if (!uuid.safeParse(missionId).success) return;
  try {
    await startMission(user.id, missionId);
  } catch (error) {
    if (!(error instanceof MissionNotFoundError)) throw error;
  }
  refresh();
}

export async function skipMissionAction(missionId: string): Promise<void> {
  const { user } = await requireLearner();
  if (uuid.safeParse(missionId).success) {
    try {
      await skipMission(user.id, missionId);
    } catch (error) {
      if (!(error instanceof MissionNotFoundError)) throw error;
    }
  }
  redirect("/projects");
}

export type PostState = { error?: string };

/** Drafts (or redrafts) a reviewed project's posts and shows them. */
export async function draftProjectPostAction(missionId: string): Promise<PostState> {
  const { user } = await requireLearner();
  if (!uuid.safeParse(missionId).success) return { error: "That project no longer exists." };
  try {
    await projectPostDraft(user.id, missionId);
  } catch (error) {
    if (error instanceof NotReviewedError)
      return { error: "The post is written once the project is reviewed." };
    if (error instanceof TooManyDraftsError) {
      return { error: "That's four drafts for this project. Edit the last one; it's yours to change." };
    }
    console.error(JSON.stringify({ event: "post.failed", reason: String(error) }));
    return { error: "Drafting didn't finish. Try again in a moment." };
  }
  refresh();
  return {};
}
