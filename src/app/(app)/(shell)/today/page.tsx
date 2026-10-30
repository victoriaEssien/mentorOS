import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { InstallHint } from "@/components/shell/install-hint";
import { NAV_FORWARD } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { MissionCard } from "@/components/system/mission-card";
import { Badge } from "@/components/ui/badge";
import { greetingFor, knownTimeZone, TIME_ZONE_COOKIE, today as todayIn } from "@/lib/local-time";
import { findConcept } from "@/lib/themes";
import { VERDICT_BADGE } from "@/lib/verdicts";
import { dailySession, expireMissions } from "@/server/learning/loop";
import { countRolledOver } from "@/server/queries/concepts";
import { hasPassword } from "@/server/queries/learner";
import { getThemeProject } from "@/server/queries/missions";
import { requireLearner } from "@/server/session";

import { NextProjectPanel } from "../projects/project-controls";
import { EmailNotice, type EmailNoticeState } from "./email-notice";

export const metadata: Metadata = { title: "Today" };

// Writing the theme's project runs a model call inside this route's server action.
export const maxDuration = 120;

/**
 * Today: the week's theme, today's session (one new concept and the reviews that are due), and the
 * theme's project. The app hands each one over; nothing here asks the learner to choose.
 */
export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const { user } = await requireLearner();
  // Anything past its due time shows as over, not open.
  await expireMissions(user.id);
  const [cookieStore, emailState] = await Promise.all([cookies(), emailNoticeState(user, searchParams)]);
  const timeZone = knownTimeZone(cookieStore.get(TIME_ZONE_COOKIE)?.value);
  const { title, date } = greetingFor(user.name, timeZone);
  const day = todayIn(timeZone);

  const { themeDay, attempts } = await dailySession(user.id, day);
  const [rolledOver, project] = await Promise.all([
    countRolledOver(
      user.id,
      day,
      attempts.map((a) => a.conceptSlug),
    ),
    getThemeProject(user.id, themeDay.run.missionId),
  ]);
  const { theme } = themeDay;

  return (
    <Screen>
      <ScreenHeader title={title} subtitle={date ?? "Here's today."} />

      {emailState ? <EmailNotice state={emailState} email={user.email} /> : null}

      <section aria-label="This week's theme" className="rounded-lg bg-signal p-5 text-signal-foreground">
        <p className="text-caption font-semibold">
          {theme.weeks === 2 ? `Week ${themeDay.week} of 2` : "This week"},{" "}
          {themeDay.daysLeft === 1 ? "last day" : `${themeDay.daysLeft} days left`}
        </p>
        <h2 className="mt-1 text-title">{theme.title}</h2>
        <p className="mt-1 text-callout">{theme.summary}</p>
      </section>

      <ScreenSection title="Today's session">
        {attempts.length === 0 ? (
          <p className="text-callout text-muted-foreground">
            Nothing new or due today. Spend the time on your project.
          </p>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {attempts.map((attempt) => {
              const entry = findConcept(attempt.conceptSlug);
              const badge = attempt.verdict ? VERDICT_BADGE[attempt.verdict] : null;
              return (
                <li key={attempt.id}>
                  <Link
                    transitionTypes={NAV_FORWARD}
                    href={`/concepts/${attempt.id}`}
                    className="flex pressable items-center gap-3 rounded-lg border border-rule bg-window px-4 py-3.5 shadow-window outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-footnote text-muted-foreground">
                        {attempt.kind === "new"
                          ? "New concept"
                          : `Review, from ${entry?.theme.title ?? "earlier"}`}
                      </span>
                      <span className="mt-0.5 block text-headline">
                        {entry?.concept.title ?? attempt.conceptSlug}
                      </span>
                    </span>
                    {badge ? (
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    ) : (
                      <Badge variant={attempt.kind === "new" ? "signal" : "outline"}>To explain</Badge>
                    )}
                    <ChevronRight aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
        {rolledOver > 0 ? (
          <p className="mt-2.5 text-footnote text-muted-foreground">
            {rolledOver} more {rolledOver === 1 ? "review is" : "reviews are"} due. They roll over to
            tomorrow.
          </p>
        ) : null}
      </ScreenSection>

      <ScreenSection title={`${theme.title} project`}>
        {project ? <MissionCard mission={project} /> : <NextProjectPanel auto />}
      </ScreenSection>

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
