import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Screen, ScreenHeader } from "@/components/shell/screen";
import { getMissionDetail } from "@/server/queries/missions";
import { requireLearner } from "@/server/session";

import { HandInForm } from "./hand-in-form";

export const metadata: Metadata = { title: "Hand in" };

// Handing in reads the linked work and evaluates it with the model before redirecting.
export const maxDuration = 300;

export default async function MissionSubmitPage({ params }: PageProps<"/missions/[missionId]/submit">) {
  const { user } = await requireLearner();
  const { missionId } = await params;

  const detail = await getMissionDetail(user.id, missionId);
  if (!detail) notFound();
  const { mission } = detail;
  if (mission.status === "evaluated") redirect(`/missions/${missionId}/evaluation`);
  if (mission.status !== "assigned" && mission.status !== "in_progress") redirect(`/missions/${missionId}`);

  return (
    <Screen>
      <ScreenHeader
        title="Hand in"
        subtitle={mission.title}
        back={{ href: `/missions/${missionId}`, label: "Mission" }}
      />
      <HandInForm
        missionId={missionId}
        deliverable={mission.deliverable}
        weekly={mission.cadence === "weekly"}
      />
    </Screen>
  );
}
