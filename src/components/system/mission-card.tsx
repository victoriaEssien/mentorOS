import Link from "next/link";

import { NAV_FORWARD } from "@/components/shell/page-transition";
import { DifficultyCells } from "@/components/system/difficulty-cells";
import { Badge } from "@/components/ui/badge";
import { durationLabel, MISSION_STATUS_LABEL, missionTypeLabel, timeLeftLabel } from "@/lib/mission-labels";
import type { MissionsOverview } from "@/server/queries/missions";

export type MissionSummary = NonNullable<MissionsOverview["weekly"]>;

/** A project in play, as one tappable window: what stack, how long, how hard, and what for. */
export function MissionCard({ mission }: { mission: MissionSummary }) {
  const duration = durationLabel(mission.estimatedMinutes);
  // Handed-in work is waiting on the evaluation, not on the clock.
  const left = mission.status === "submitted" ? null : timeLeftLabel(mission.dueAt);
  return (
    <Link
      transitionTypes={NAV_FORWARD}
      href={`/projects/${mission.id}`}
      className="block pressable rounded-lg border border-rule bg-window p-5 shadow-window outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-footnote text-muted-foreground">
          {mission.stack ?? missionTypeLabel(mission.type)}
          {duration ? `, ${duration.toLowerCase()}` : ""}
          {left ? `, ${left}` : ""}
        </span>
        <Badge variant={mission.status === "assigned" ? "signal" : "neutral"}>
          {MISSION_STATUS_LABEL[mission.status]}
        </Badge>
      </span>
      <span className="mt-2 block text-headline">{mission.title}</span>
      <span className="mt-1 line-clamp-3 text-callout text-muted-foreground">{mission.objective}</span>
      {mission.difficulty ? (
        <span className="mt-3 flex items-center gap-2 text-caption text-muted-foreground">
          <DifficultyCells level={mission.difficulty} />
          Difficulty {mission.difficulty} of 5
        </span>
      ) : null}
    </Link>
  );
}
