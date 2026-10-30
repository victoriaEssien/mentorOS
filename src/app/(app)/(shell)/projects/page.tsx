import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { NAV_FORWARD } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { MissionCard } from "@/components/system/mission-card";
import { Badge } from "@/components/ui/badge";
import { MISSION_STATUS_LABEL } from "@/lib/mission-labels";
import { OUTCOME_BADGE } from "@/lib/outcomes";
import { knownTimeZone, TIME_ZONE_COOKIE, today } from "@/lib/local-time";
import { currentTheme, expireMissions } from "@/server/learning/loop";
import { getMissionsOverview, getThemeProject } from "@/server/queries/missions";
import { requireLearner } from "@/server/session";

import { NextProjectPanel } from "./project-controls";

export const metadata: Metadata = { title: "Projects" };

// Writing a project runs a model call inside this route's server action.
export const maxDuration = 120;

export default async function ProjectsPage() {
  const { user } = await requireLearner();
  // Anything past its due time shows as over, not open.
  await expireMissions(user.id);
  const day = today(knownTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value));
  const { run, theme } = await currentTheme(user.id, day);
  const [project, { done }] = await Promise.all([
    getThemeProject(user.id, run.missionId),
    getMissionsOverview(user.id),
  ]);
  const past = done.filter((row) => row.id !== project?.id);

  return (
    <Screen>
      <ScreenHeader title="Projects" subtitle="One per theme. Build it your way, then hand in the repo." />

      <ScreenSection title={`${theme.title} project`}>
        {project ? <MissionCard mission={project} /> : <NextProjectPanel auto />}
      </ScreenSection>

      {past.length > 0 ? (
        <ScreenSection title="Past projects">
          <ol className="divide-y divide-rule border-y border-rule">
            {past.map((past) => {
              const badge = past.outcome ? OUTCOME_BADGE[past.outcome] : null;
              return (
                <li key={past.id}>
                  <Link
                    transitionTypes={NAV_FORWARD}
                    href={`/projects/${past.id}`}
                    className="flex pressable items-center justify-between gap-3 py-3.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-body font-semibold">{past.title}</span>
                      <span className="block text-footnote text-muted-foreground">
                        {past.stack ? `${past.stack}, ` : ""}
                        {/* A missed project is dated by when it was due, not when the miss was recorded. */}
                        {(
                          (past.status === "expired" ? past.dueAt : null) ?? past.updatedAt
                        ).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </span>
                    {badge ? (
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    ) : (
                      <Badge variant="outline">{MISSION_STATUS_LABEL[past.status]}</Badge>
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
