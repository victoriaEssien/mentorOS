import { Route as RouteIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { AlertCard } from "@/components/system/alert-card";
import { DifficultyCells } from "@/components/system/difficulty-cells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { durationLabel, MISSION_STATUS_LABEL, missionTypeLabel } from "@/lib/mission-labels";
import { getMissionsOverview, type MissionsOverview } from "@/server/queries/missions";
import { requireLearner } from "@/server/session";

import { GetMissionPanel } from "./mission-controls";

export const metadata: Metadata = { title: "Missions" };

// Writing a mission runs a model call inside this route's server action.
export const maxDuration = 120;

type MissionSummary = NonNullable<MissionsOverview["daily"]>;

const OUTCOME_BADGE = {
  strong: { label: "Strong", variant: "pass" },
  pass: { label: "Pass", variant: "pass" },
  partial: { label: "Partial", variant: "partial" },
  fail: { label: "Didn't pass", variant: "fail" },
} as const;

export default async function MissionsPage() {
  const { user } = await requireLearner();
  const { hasPath, daily, weekly, done } = await getMissionsOverview(user.id);

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
        <ScreenSection title="Done">
          <ol className="divide-y divide-rule border-y border-rule">
            {done.map((mission) => {
              const badge = mission.outcome ? OUTCOME_BADGE[mission.outcome] : null;
              return (
                <li key={mission.id}>
                  <Link
                    href={`/missions/${mission.id}`}
                    className="flex pressable items-center justify-between gap-3 py-3.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-body font-semibold">{mission.title}</span>
                      <span className="block text-footnote text-muted-foreground">
                        {missionTypeLabel(mission.type)},{" "}
                        {mission.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
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

function MissionCard({ mission }: { mission: MissionSummary }) {
  const duration = durationLabel(mission.estimatedMinutes);
  return (
    <Link
      href={`/missions/${mission.id}`}
      className="block pressable rounded-lg border border-rule bg-window p-5 shadow-window outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-footnote text-muted-foreground">
          {missionTypeLabel(mission.type)}
          {duration ? `, ${duration.toLowerCase()}` : ""}
        </span>
        <Badge variant={mission.status === "assigned" ? "signal" : "neutral"}>
          {MISSION_STATUS_LABEL[mission.status]}
        </Badge>
      </span>
      <span className="mt-2 block text-headline">{mission.title}</span>
      <span className="mt-1 line-clamp-3 block text-callout text-muted-foreground">{mission.objective}</span>
      {mission.difficulty ? (
        <span className="mt-3 flex items-center gap-2 text-caption text-muted-foreground">
          <DifficultyCells level={mission.difficulty} />
          Difficulty {mission.difficulty} of 5
        </span>
      ) : null}
    </Link>
  );
}
