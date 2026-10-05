"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { assignNextMission } from "@/server/learning/loop";
import { MissionNotFoundError, NoPathError, skipMission, startMission } from "@/server/learning/missions";
import { requireLearner } from "@/server/session";

const uuid = z.uuid();

export type GetMissionState = { error?: string };

/** Writes the next mission for this cadence (or finds the one in play) and opens it. */
export async function getMissionAction(cadence: "daily" | "weekly"): Promise<GetMissionState> {
  const { user } = await requireLearner();
  let missionId: string;
  try {
    ({ missionId } = await assignNextMission(user.id, cadence));
  } catch (error) {
    if (error instanceof NoPathError) {
      return { error: "Missions come from your path's current focus, and you don't have a path yet." };
    }
    console.error(JSON.stringify({ event: "mission.assign_failed", cadence, reason: String(error) }));
    return { error: "Writing the mission didn't finish. Try again in a moment." };
  }
  redirect(`/missions/${missionId}`);
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
  redirect("/missions");
}
