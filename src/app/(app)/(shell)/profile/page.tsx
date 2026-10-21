import { ChevronRight, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";

import { Pip } from "@/components/brand/pip";
import { NAV_FORWARD } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { PipPanel } from "@/components/system/pip-panel";
import { SkillRow } from "@/components/system/skill-row";
import { Button } from "@/components/ui/button";
import { abilityLabel } from "@/lib/skill-labels";
import { getOpenDiagnosticId } from "@/server/learning/diagnostic";
import { getSkillProfile, type SkillProfile } from "@/server/queries/profile";
import { getRecentResults } from "@/server/queries/today";
import { requireLearner } from "@/server/session";

import { TrackTabs } from "./track-tabs";

export const metadata: Metadata = { title: "Skill profile" };

export default async function SkillProfilePage() {
  const { user } = await requireLearner();
  const [profile, openDiagnosticId, week] = await Promise.all([
    getSkillProfile(user.id),
    getOpenDiagnosticId(user.id),
    getRecentResults(user.id, 50, weekAgo()),
  ]);

  const panels = profile.map((track) => <TrackPanel key={track.id} track={track} />);
  const strongest = profile
    .flatMap((track) => track.groups.flatMap((group) => group.skills))
    .flatMap((skill) => (skill.estimate ? [{ name: skill.name, ability: skill.estimate.ability }] : []))
    .sort((a, b) => b.ability - a.ability)[0];

  return (
    <Screen>
      <ScreenHeader
        title="You"
        subtitle="What I believe you can do, and the evidence behind it."
        actions={
          <Button asChild variant="ghost" size="icon">
            <Link transitionTypes={NAV_FORWARD} href="/settings" aria-label="Settings">
              <Settings className="size-5.5" />
            </Link>
          </Button>
        }
      />

      {openDiagnosticId ? (
        <PipPanel
          title="Your diagnostic is waiting"
          className="mb-8"
          action={
            <Button asChild>
              <Link transitionTypes={NAV_FORWARD} href={`/assessments/${openDiagnosticId}`}>
                Continue the diagnostic
              </Link>
            </Button>
          }
        >
          Until I&apos;ve seen your answers, every estimate here is empty. Answers save as you go.
        </PipPanel>
      ) : (
        <WeekSummary outcomes={week.map((result) => result.outcome)} strongest={strongest} />
      )}

      {profile.length > 1 ? <TrackTabs tracks={profile} panels={panels} /> : panels}

      <ScreenSection title="History">
        <Link
          transitionTypes={NAV_FORWARD}
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

/** The start of the past seven days, for the week's summary. */
function weekAgo() {
  return new Date(Date.now() - 7 * 86_400_000);
}

/**
 * The week in one window: how the work went, with Pip reacting to it, and the strongest skill so
 * far. Counts only, so there's nothing here to argue with.
 */
function WeekSummary({
  outcomes,
  strongest,
}: {
  outcomes: ("strong" | "pass" | "partial" | "fail")[];
  strongest: { name: string; ability: number } | undefined;
}) {
  const passed = outcomes.filter((outcome) => outcome === "strong" || outcome === "pass").length;
  const notYet = outcomes.length - passed;
  const mood = outcomes.length === 0 ? "asleep" : passed >= notYet ? "pass" : "notYet";
  const title =
    outcomes.length === 0
      ? "Nothing new this week"
      : `${[passed > 0 && `${passed} passed`, notYet > 0 && `${notYet} not yet`].filter(Boolean).join(", ")} this week`;

  return (
    <div className="mb-8 flex items-center gap-4 rounded-lg border-2 border-foreground bg-window p-4 shadow-[0_4px_0_var(--color-foreground)] dark:border-rule-strong dark:shadow-window">
      <Pip mood={mood} size={60} />
      <div className="min-w-0">
        <p className="text-headline">{title}</p>
        <p className="mt-0.5 text-footnote text-muted-foreground">
          {strongest
            ? `Strongest so far: ${strongest.name}, ${abilityLabel(strongest.ability).toLowerCase()}.`
            : "Your first results will show up here."}
        </p>
      </div>
    </div>
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
            transitionTypes={NAV_FORWARD}
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
