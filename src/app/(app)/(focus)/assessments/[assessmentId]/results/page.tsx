import { X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { NAV_BACK } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { Button } from "@/components/ui/button";
import { getAssessmentResults } from "@/server/queries/assessments";
import { requireLearner } from "@/server/session";

import { AnswerList, AnswerStrip, Misconceptions, SkillList } from "./review";

export const metadata: Metadata = { title: "Results" };

export default async function AssessmentResultsPage({
  params,
}: PageProps<"/assessments/[assessmentId]/results">) {
  const { user } = await requireLearner();
  const { assessmentId } = await params;

  const results = await getAssessmentResults(user.id, assessmentId);
  if (!results) notFound();
  if (!results.review) redirect(`/assessments/${assessmentId}`);
  const { assessment, review } = results;
  const hasMisconceptions = review.answers.some((answer) => answer.grade.misconception);

  return (
    <>
      <Screen className="pb-[calc(env(safe-area-inset-bottom)+7rem)] lg:pb-32">
        <ScreenHeader
          title={assessment.kind === "diagnostic" ? "Here’s what I found" : "Results"}
          subtitle={`${assessment.title}, handed in ${handedIn(review.completedAt)}.`}
          actions={
            <Button asChild variant="ghost" size="icon">
              <Link transitionTypes={NAV_BACK} href="/today" aria-label="Close">
                <X className="size-5.5" />
              </Link>
            </Button>
          }
        />

        <AnswerStrip answers={review.answers} />

        <ScreenSection title="Where you stand">
          <p className="-mt-1 mb-3 text-footnote text-muted-foreground">
            {assessment.kind === "diagnostic"
              ? "First estimates, from one assessment."
              : "Your estimates now, with this check's answers counted in."}{" "}
            A hatched meter means I need more evidence before I&apos;d stand behind it.
          </p>
          <SkillList skills={review.skills} />
        </ScreenSection>

        {hasMisconceptions ? (
          <ScreenSection title="What I noticed">
            <Misconceptions answers={review.answers} />
          </ScreenSection>
        ) : null}

        <ScreenSection title="Your answers">
          <AnswerList answers={review.answers} />
        </ScreenSection>
      </Screen>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-window pb-safe">
        <div className="mx-auto w-full max-w-2xl px-4 py-3 sm:px-6 lg:px-10">
          <Button asChild size="lg" className="w-full">
            {assessment.kind === "diagnostic" ? (
              <Link href="/path">See your learning path</Link>
            ) : (
              <Link href="/profile">See your skills</Link>
            )}
          </Button>
        </div>
      </footer>
    </>
  );
}

/** "today", "yesterday" or the date, in the learner's words. */
function handedIn(completedAt: Date) {
  const day = (date: Date) => Math.floor(date.getTime() / 86_400_000);
  const daysAgo = day(new Date()) - day(completedAt);
  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "yesterday";
  return `on ${completedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
}
