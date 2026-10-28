import { X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PipSays } from "@/components/brand/pip";
import { NAV_BACK } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { Button } from "@/components/ui/button";
import { getAssessmentResults } from "@/server/queries/assessments";
import { getDailyNote } from "@/server/queries/posts";
import { requireLearner } from "@/server/session";

import { DailyNoteForm } from "./daily-note";
import { AnswerList, AnswerStrip, Misconceptions, SkillList, tallyAnswers } from "./review";

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
  const note = assessment.kind === "daily" ? await getDailyNote(user.id, assessmentId) : null;
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

        <Verdict kind={assessment.kind} outcome={review.outcome} tally={tallyAnswers(review.answers)} />

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

        {assessment.kind === "daily" ? (
          <ScreenSection title="Your note">
            <DailyNoteForm assessmentId={assessmentId} note={note} />
          </ScreenSection>
        ) : null}
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

/**
 * Pip's one-line read of the result. A diagnostic measures rather than judges, so it gets no
 * verdict, just where the learner starts. "Not yet" is said plainly and never as a failure.
 */
function Verdict({
  kind,
  outcome,
  tally,
}: {
  kind: string;
  outcome: "strong" | "pass" | "partial" | "fail";
  tally: { right: number; partly: number; total: number };
}) {
  const counted = `${tally.right} of ${tally.total} right${tally.partly > 0 ? `, ${tally.partly} partly right` : ""}.`;
  if (kind === "diagnostic") {
    return (
      <PipSays className="mb-5">
        That&apos;s your starting point: {counted} Everything that comes next is pitched from here.
      </PipSays>
    );
  }
  if (outcome === "strong" || outcome === "pass") {
    return (
      <PipSays mood="pass" className="mb-5">
        That holds up. {counted}
      </PipSays>
    );
  }
  return (
    <PipSays mood="notYet" className="mb-5">
      Not yet. {counted} The misses below are the next thing to work on, and they count as evidence, not
      against you.
    </PipSays>
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
