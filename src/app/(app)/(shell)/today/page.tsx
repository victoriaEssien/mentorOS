import { ClipboardList, Flag, Route as RouteIcon, Zap } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { after } from "next/server";

import { NAV_FORWARD } from "@/components/shell/page-transition";
import { InstallHint } from "@/components/shell/install-hint";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { AlertCard } from "@/components/system/alert-card";
import { MissionCard, type MissionSummary } from "@/components/system/mission-card";
import { SkillRow } from "@/components/system/skill-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ASSESSMENT_KIND_LABEL } from "@/lib/assessment-kinds";
import { greetingFor, knownTimeZone, shortDate, TIME_ZONE_COOKIE } from "@/lib/local-time";
import { durationLabel, missionTypeLabel } from "@/lib/mission-labels";
import { OUTCOME_BADGE } from "@/lib/outcomes";
import { nextAction, type NextAction } from "@/lib/today";
import { cn } from "@/lib/utils";
import { surpriseCheck } from "@/server/learning/loop";
import { hasPassword } from "@/server/queries/learner";
import { getToday, type Today } from "@/server/queries/today";
import { requireLearner } from "@/server/session";

import { GetMissionPanel } from "../missions/mission-controls";
import { EmailNotice, type EmailNoticeState } from "./email-notice";
import { WriteDiagnosticPanel } from "./write-diagnostic";

export const metadata: Metadata = { title: "Today" };

// Writing today's mission, or a diagnostic onboarding couldn't, runs model calls inside this
// route's server actions.
export const maxDuration = 120;

type OpenAssessment = Today["openChecks"][number];

const ROW =
  "flex pressable items-center justify-between gap-3 py-3.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Today (PRD §26): what to do next, what's in play, and where the learner stands. */
export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const { user } = await requireLearner();
  const [today, cookieStore, emailState] = await Promise.all([
    getToday(user.id),
    cookies(),
    emailNoticeState(user, searchParams),
  ]);
  const timeZone = knownTimeZone(cookieStore.get(TIME_ZONE_COOKIE)?.value);
  const { title, date } = greetingFor(user.name, timeZone);

  const next = nextAction({
    openDiagnostic: today.openDiagnostic,
    hasDiagnostic: today.hasDiagnostic,
    hasPath: Boolean(today.path.active),
    pathOnItsWay: today.path.firstPathOnItsWay,
    openSurprise: today.openSurprise,
    daily: today.daily,
    openChecks: today.openChecks,
  });

  // On the days a surprise check is due, it's written after this response, ready for the next visit.
  if (!today.openSurprise && !today.openDiagnostic) {
    const userId = user.id;
    after(async () => {
      try {
        await surpriseCheck(userId);
      } catch (error) {
        console.error(JSON.stringify({ event: "surprise.failed", reason: String(error) }));
      }
    });
  }

  // In play but not already the next action.
  const missions = [today.daily, today.weekly].filter(
    (mission): mission is MissionSummary =>
      mission !== null && !(next.kind === "mission" && next.mission.id === mission.id),
  );
  const checks = today.openChecks.filter(
    (check) => !(next.kind === "check" && next.assessment.id === check.id),
  );

  const { current, steps } = today.path;
  const developing = steps
    .filter((step) => (step.status === "current" || step.status === "upcoming") && step.skill)
    .filter((step, index, all) => all.findIndex((other) => other.skill!.slug === step.skill!.slug) === index)
    .slice(0, 4);

  return (
    <Screen>
      <ScreenHeader title={title} subtitle={date ?? "Here's where you stand."} />

      {emailState ? <EmailNotice state={emailState} email={user.email} /> : null}

      <NextCard next={next} />

      {current ? (
        <ScreenSection title="Focus">
          <Link
            href="/path"
            className="block pressable rounded-lg border border-rule bg-window p-5 shadow-window outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="text-footnote text-muted-foreground">
              {current.skill ? `${current.skill.name}, ` : ""}step {steps.indexOf(current) + 1} of{" "}
              {steps.length}
            </span>
            <span className="mt-1 block text-headline">{current.title}</span>
            <span className="mt-1 line-clamp-3 block text-callout text-muted-foreground">
              {current.reason}
            </span>
          </Link>
        </ScreenSection>
      ) : null}

      {missions.length > 0 || checks.length > 0 ? (
        <ScreenSection title="Also in play">
          <div className="flex flex-col gap-3">
            {missions.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
          {checks.length > 0 ? (
            <ul className={cn("divide-y divide-rule border-y border-rule", missions.length > 0 && "mt-3")}>
              {checks.map((check) => (
                <li key={check.id}>
                  <Link transitionTypes={NAV_FORWARD} href={`/assessments/${check.id}`} className={ROW}>
                    <span className="min-w-0">
                      <span className="block truncate text-body font-semibold">{check.title}</span>
                      <span className="block text-footnote text-muted-foreground">
                        {ASSESSMENT_KIND_LABEL[check.kind]}, {shortDate(check.createdAt, timeZone)}
                      </span>
                    </span>
                    <Badge variant="outline">Not finished</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </ScreenSection>
      ) : null}

      {developing.length > 0 ? (
        <ScreenSection
          title="Skills you're developing"
          action={
            <Link
              href="/profile"
              className="text-footnote text-muted-foreground underline decoration-rule-strong underline-offset-4 hover:text-foreground"
            >
              All skills
            </Link>
          }
        >
          <ul className="divide-y divide-rule border-y border-rule">
            {developing.map((step) => (
              <li key={step.skill!.slug}>
                <SkillRow
                  name={step.skill!.name}
                  estimate={step.estimate}
                  href={`/profile/skills/${step.skill!.slug}`}
                />
              </li>
            ))}
          </ul>
        </ScreenSection>
      ) : null}

      {today.recent.length > 0 ? (
        <ScreenSection title="Recent evidence">
          <ol className="divide-y divide-rule border-y border-rule">
            {today.recent.map((result) => {
              const badge = OUTCOME_BADGE[result.outcome];
              return (
                <li key={result.id}>
                  <Link transitionTypes={NAV_FORWARD} href={result.href} className={ROW}>
                    <span className="min-w-0">
                      <span className="block truncate text-body font-semibold">{result.title}</span>
                      <span className="block text-footnote text-muted-foreground">
                        {result.label}, {shortDate(result.at, timeZone)}
                      </span>
                    </span>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ol>
        </ScreenSection>
      ) : null}

      <InstallHint />
    </Screen>
  );
}

/**
 * What Today says about the address, if anything. The confirm link lands here with
 * `?email=confirmed`, and Better Auth adds `error` when the link had expired or was damaged.
 */
async function emailNoticeState(
  user: { id: string; emailVerified: boolean },
  searchParams: PageProps<"/today">["searchParams"],
): Promise<EmailNoticeState | null> {
  const { email, error } = await searchParams;
  if (user.emailVerified) return email === "confirmed" ? "confirmed" : null;
  if (error) return "link-failed";
  // Only email sign-ups were sent a link. Google and GitHub vouch for their own addresses.
  return (await hasPassword(user.id)) ? "unconfirmed" : null;
}

/** The one thing to do next, as a system alert holding the screen's only primary action. */
function NextCard({ next }: { next: NextAction<MissionSummary, OpenAssessment> }) {
  switch (next.kind) {
    case "diagnostic":
      return (
        <AlertCard
          icon={<ClipboardList aria-hidden />}
          title="Finish your diagnostic"
          actions={
            <Button asChild>
              <Link transitionTypes={NAV_FORWARD} href={`/assessments/${next.assessment.id}`}>
                Continue the diagnostic
              </Link>
            </Button>
          }
        >
          Your path and missions start from your answers. They save as you go.
        </AlertCard>
      );

    case "path-on-its-way":
      return (
        <AlertCard
          icon={<RouteIcon aria-hidden />}
          tone="neutral"
          title="Your path is on its way"
          actions={
            <Button asChild variant="secondary">
              <Link href="/path">See your path</Link>
            </Button>
          }
        >
          I&apos;m choosing what you work on first from your diagnostic. It takes about half a minute.
        </AlertCard>
      );

    case "plan-path":
      return (
        <AlertCard
          icon={<RouteIcon aria-hidden />}
          title="Plan your path"
          actions={
            <Button asChild>
              <Link href="/path">Go to your path</Link>
            </Button>
          }
        >
          Missions come from your path&apos;s current focus, so the path comes first.
        </AlertCard>
      );

    case "surprise":
      return (
        <AlertCard
          icon={<Zap aria-hidden />}
          title="Surprise check"
          actions={
            <Button asChild>
              <Link transitionTypes={NAV_FORWARD} href={`/assessments/${next.assessment.id}`}>
                Start the check
              </Link>
            </Button>
          }
        >
          A few quick questions on something you learned a while ago. No warning, on purpose, so it shows what
          has stuck.
        </AlertCard>
      );

    case "mission": {
      const { mission } = next;
      const duration = durationLabel(mission.estimatedMinutes);
      const action =
        mission.status === "assigned"
          ? "Start today's mission"
          : mission.status === "in_progress"
            ? "Continue today's mission"
            : "Open the mission";
      return (
        <AlertCard
          icon={<Flag aria-hidden />}
          tone={mission.status === "submitted" ? "neutral" : "signal"}
          title={mission.title}
          actions={
            <Button asChild variant={mission.status === "submitted" ? "secondary" : "default"}>
              <Link transitionTypes={NAV_FORWARD} href={`/missions/${mission.id}`}>
                {action}
              </Link>
            </Button>
          }
        >
          <span className="block">
            {mission.status === "submitted" ? "Handed in. " : ""}
            {missionTypeLabel(mission.type)}
            {duration ? `, ${duration.toLowerCase()}` : ""}.
          </span>
          <span className="mt-1 line-clamp-2 block">{mission.objective}</span>
        </AlertCard>
      );
    }

    case "check":
      return (
        <AlertCard
          icon={<ClipboardList aria-hidden />}
          title={`Your ${ASSESSMENT_KIND_LABEL[next.assessment.kind].toLowerCase()} is waiting`}
          actions={
            <Button asChild>
              <Link transitionTypes={NAV_FORWARD} href={`/assessments/${next.assessment.id}`}>
                Continue the check
              </Link>
            </Button>
          }
        >
          {next.assessment.title}. Answers save as you go.
        </AlertCard>
      );

    case "write-diagnostic":
      return <WriteDiagnosticPanel />;

    case "get-mission":
      return (
        <GetMissionPanel
          cadence="daily"
          title="Ready for today's mission?"
          description="Something to build or fix for your current focus, in under an hour and a half."
          action="Get today's mission"
        />
      );
  }
}
