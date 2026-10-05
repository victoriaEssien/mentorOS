import { ChevronRight, ClipboardList, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";

import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { AlertCard } from "@/components/system/alert-card";
import { SkillRow } from "@/components/system/skill-row";
import { Button } from "@/components/ui/button";
import { getOpenDiagnosticId } from "@/server/learning/diagnostic";
import { getSkillProfile, type SkillProfile } from "@/server/queries/profile";
import { requireLearner } from "@/server/session";

import { TrackTabs } from "./track-tabs";

export const metadata: Metadata = { title: "Skill profile" };

export default async function SkillProfilePage() {
  const { user } = await requireLearner();
  const [profile, openDiagnosticId] = await Promise.all([
    getSkillProfile(user.id),
    getOpenDiagnosticId(user.id),
  ]);

  const panels = profile.map((track) => <TrackPanel key={track.id} track={track} />);

  return (
    <Screen>
      <ScreenHeader
        title="You"
        subtitle="What I believe you can do, and the evidence behind it."
        actions={
          <Button asChild variant="ghost" size="icon">
            <Link href="/settings" aria-label="Settings">
              <Settings className="size-5.5" />
            </Link>
          </Button>
        }
      />

      {openDiagnosticId ? (
        <AlertCard
          icon={<ClipboardList aria-hidden />}
          title="Your diagnostic is waiting"
          className="mb-8"
          actions={
            <Button asChild>
              <Link href={`/assessments/${openDiagnosticId}`}>Continue the diagnostic</Link>
            </Button>
          }
        >
          Until I&apos;ve seen your answers, every estimate here is empty. Answers save as you go.
        </AlertCard>
      ) : null}

      {profile.length > 1 ? <TrackTabs tracks={profile} panels={panels} /> : panels}

      <ScreenSection title="History">
        <Link
          href="/assessments"
          className="flex pressable items-center justify-between gap-3 rounded-lg border border-rule bg-window px-4 py-3.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span>
            <span className="block text-body font-semibold">Assessments</span>
            <span className="block text-footnote text-muted-foreground">
              Your diagnostic, checks and their results
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </ScreenSection>
    </Screen>
  );
}

/**
 * Skills nothing has measured yet, as one quiet line of links: honest about the gaps in what I
 * know without burying the estimates that exist.
 */
function Unmeasured({ skills }: { skills: SkillProfile[number]["groups"][number]["skills"] }) {
  if (skills.length === 0) return null;
  return (
    <p className="mt-3 text-footnote text-muted-foreground">
      Not measured yet:{" "}
      {skills.map((skill, index) => (
        <Fragment key={skill.id}>
          <Link
            href={`/profile/skills/${skill.slug}`}
            className="underline decoration-rule-strong underline-offset-4 hover:text-foreground"
          >
            {skill.name}
          </Link>
          {index < skills.length - 1 ? ", " : "."}
        </Fragment>
      ))}
    </p>
  );
}

function TrackPanel({ track }: { track: SkillProfile[number] }) {
  const skills = track.groups.flatMap((group) => group.skills);
  const measured = skills.filter((skill) => skill.estimate).length;

  return (
    <div>
      <p className="mb-6 text-footnote text-muted-foreground">
        {track.name}: {measured} of {skills.length} skills measured.
      </p>
      {track.groups.map((group) => {
        const groupMeasured = group.skills.filter((skill) => skill.estimate).length;
        return (
          <ScreenSection
            key={group.id}
            title={group.name}
            action={
              <span className="text-footnote text-muted-foreground tabular-nums">
                {groupMeasured} of {group.skills.length}
              </span>
            }
          >
            {groupMeasured > 0 ? (
              <ul className="divide-y divide-rule border-y border-rule">
                {group.skills.map((skill) =>
                  skill.estimate ? (
                    <li key={skill.id}>
                      <SkillRow
                        name={skill.name}
                        estimate={skill.estimate}
                        href={`/profile/skills/${skill.slug}`}
                      />
                    </li>
                  ) : null,
                )}
              </ul>
            ) : null}
            <Unmeasured skills={group.skills.filter((skill) => !skill.estimate)} />
          </ScreenSection>
        );
      })}
    </div>
  );
}
