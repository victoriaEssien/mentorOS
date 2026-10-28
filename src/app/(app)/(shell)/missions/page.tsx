import { Route as RouteIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { NAV_FORWARD } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { AlertCard } from "@/components/system/alert-card";
import { MissionCard } from "@/components/system/mission-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MISSION_STATUS_LABEL, missionTypeLabel, tallyLabel } from "@/lib/mission-labels";
import { OUTCOME_BADGE } from "@/lib/outcomes";
import { expireMissions } from "@/server/learning/loop";
import { getMissionsOverview, getMissionTally } from "@/server/queries/missions";
import { requireLearner } from "@/server/session";

import { GetMissionPanel, MissionOverPanel } from "./mission-controls";

export const metadata: Metadata = { title: "Missions" };

// Writing a mission runs a model call inside this route's server action.
export const maxDuration = 120;

export default async function MissionsPage() {
  const { user } = await requireLearner();
  // Anything past its due time shows as over, not open.
  await expireMissions(user.id);
  const [{ hasPath, daily, weekly, dailyOver, weeklyOver, done }, tally] = await Promise.all([
    getMissionsOverview(user.id),
    getMissionTally(user.id),
  ]);
  const week = tallyLabel(tally);

  return (
    <Screen>
      <ScreenHeader title="Missions" subtitle="One thing to build at a time, each with a reason." />

      {!hasPath && !daily && !weekly ? (
        <AlertCard
          icon={<RouteIcon aria-hidden />}
          title="Missions come from your path"
          actions={
            <Button asChild>
              <Link href="/path">Go to your path</Link>
            </Button>
          }
        >
          Each mission works on your path&apos;s current focus, so the path comes first.
        </AlertCard>
      ) : (
        <>
          <ScreenSection title="Today">
            {daily ? (
              <MissionCard mission={daily} />
            ) : dailyOver ? (
              <MissionOverPanel cadence="daily" title={dailyOver.title} />
            ) : (
              <GetMissionPanel
                cadence="daily"
                title="Ready for today's mission?"
                description="Something to build or fix for your current focus, in under an hour and a half."
                action="Get today's mission"
              />
            )}
          </ScreenSection>

          <ScreenSection title="This week">
            {weekly ? (
              <MissionCard mission={weekly} />
            ) : weeklyOver ? (
              <MissionOverPanel cadence="weekly" title={weeklyOver.title} />
            ) : (
              <GetMissionPanel
                cadence="weekly"
                title="This week's challenge"
                description="A bigger build that combines several skills. Plan for three to six hours over the week."
                action="Get this week's challenge"
              />
            )}
          </ScreenSection>
        </>
      )}

      {done.length > 0 ? (
        <ScreenSection title="Past missions">
          {week ? (
            <p className="mb-3 text-footnote text-muted-foreground">Daily missions, last 7 days: {week}.</p>
          ) : null}
          <ol className="divide-y divide-rule border-y border-rule">
            {done.map((mission) => {
              const badge = mission.outcome ? OUTCOME_BADGE[mission.outcome] : null;
              return (
                <li key={mission.id}>
                  <Link
                    transitionTypes={NAV_FORWARD}
                    href={`/missions/${mission.id}`}
                    className="flex pressable items-center justify-between gap-3 py-3.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-body font-semibold">{mission.title}</span>
                      <span className="block text-footnote text-muted-foreground">
                        {missionTypeLabel(mission.type)},{" "}
                        {/* A missed mission is dated by when it was due, not when the miss was recorded. */}
                        {(
                          (mission.status === "expired" ? mission.dueAt : null) ?? mission.updatedAt
                        ).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </span>
                    {badge ? (
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    ) : (
                      <Badge variant="outline">{MISSION_STATUS_LABEL[mission.status]}</Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </ScreenSection>
      ) : null}
    </Screen>
  );
}
