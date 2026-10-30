import { ArrowUpRight, Check, CircleHelp, X } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { Badge } from "@/components/ui/badge";
import { knownTimeZone, TIME_ZONE_COOKIE, today } from "@/lib/local-time";
import { cn } from "@/lib/utils";
import { VERDICT_BADGE } from "@/lib/verdicts";
import { getAttempt } from "@/server/queries/concepts";
import { requireLearner } from "@/server/session";

import { ClearExplainDraft, ExplainForm, FollowUpForm, PrepareConcept } from "./concept-forms";

export const metadata: Metadata = { title: "Concept" };

// Writing a concept, grading an explanation and checking a follow-up run model calls in this
// route's server actions.
export const maxDuration = 120;

const STATUS = {
  hit: { label: "Hit", icon: Check, className: "text-pass" },
  missed: { label: "Missed", icon: CircleHelp, className: "text-muted-foreground" },
  wrong: { label: "Wrong", icon: X, className: "text-fail" },
} as const;

const CHECK_LABEL = { right: "Right", partly: "Partly right", wrong: "Not right" } as const;

/**
 * One concept on one day: what to explain, then, once explained, the grading against the stored
 * checklist, the verdict, the reference explanation to compare with, and the follow-up.
 */
export default async function ConceptPage({ params }: PageProps<"/concepts/[attemptId]">) {
  const { user } = await requireLearner();
  const { attemptId } = await params;
  const [found, cookieStore] = await Promise.all([getAttempt(user.id, attemptId), cookies()]);
  if (!found) notFound();
  const { attempt, stored, entry, theme } = found;
  const isToday = attempt.day === today(knownTimeZone(cookieStore.get(TIME_ZONE_COOKIE)?.value));
  const ready = Boolean(stored && attempt.question);
  const badge = attempt.verdict ? VERDICT_BADGE[attempt.verdict] : null;
  const pointText = new Map((stored?.checklist ?? []).map((item) => [item.id, item.point]));

  return (
    <Screen>
      <ScreenHeader
        title={entry.title}
        subtitle={`${theme.title}, ${attempt.kind === "new" ? "new concept" : "review"}.`}
        back={{ href: "/concepts", label: "Concepts" }}
      />

      {!attempt.explainedAt ? (
        !ready ? (
          isToday ? (
            <PrepareConcept attemptId={attempt.id} review={attempt.kind === "review"} />
          ) : (
            <p className="text-callout text-muted-foreground">
              This one wasn&apos;t explained that day. It comes back in your reviews.
            </p>
          )
        ) : (
          <>
            <section className="rounded-lg border-2 border-foreground bg-window p-5 shadow-[0_4px_0_var(--color-foreground)] dark:border-rule-strong dark:shadow-window">
              <p className="text-caption font-semibold text-muted-foreground">
                {attempt.kind === "new" ? "Research it, then explain" : "Explain it again, this way"}
              </p>
              <p className="mt-2 text-body">{attempt.question}</p>
            </section>
            <ScreenSection title="Your explanation">
              {isToday ? (
                <ExplainForm attemptId={attempt.id} />
              ) : (
                <p className="text-callout text-muted-foreground">
                  This one wasn&apos;t explained that day. It comes back in your reviews.
                </p>
              )}
            </ScreenSection>
          </>
        )
      ) : (
        <>
          <ClearExplainDraft attemptId={attempt.id} />
          <section className="rounded-lg border border-rule bg-window p-5 shadow-window">
            <div className="flex items-center justify-between gap-3">
              <p className="text-caption font-semibold text-muted-foreground">Verdict</p>
              {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
            </div>
            {attempt.grading ? <p className="mt-3 text-callout">{attempt.grading.feedback}</p> : null}
          </section>

          <ScreenSection title="Point by point">
            <ul className="divide-y divide-rule border-y border-rule">
              {(attempt.grading?.points ?? []).map((point) => {
                const status = STATUS[point.status];
                return (
                  <li key={point.id} className="flex gap-3 py-3">
                    <status.icon aria-hidden className={cn("mt-0.5 size-4.5 shrink-0", status.className)} />
                    <span className="min-w-0">
                      <span className="block text-callout font-medium">
                        <span className="sr-only">{status.label}: </span>
                        {pointText.get(point.id) ?? point.id}
                      </span>
                      <span className="mt-0.5 block text-footnote text-muted-foreground">{point.note}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </ScreenSection>

          <ScreenSection title="Follow-up">
            <p className="text-callout font-medium">{attempt.followUp}</p>
            <div className="mt-3">
              {attempt.followUpCheck ? (
                <div className="rounded-md border border-rule bg-window px-3.5 py-3">
                  <p className="text-footnote whitespace-pre-line text-muted-foreground">
                    {attempt.followUpAnswer}
                  </p>
                  <p className="mt-2 text-callout">
                    <span className="font-semibold">{CHECK_LABEL[attempt.followUpCheck.result]}. </span>
                    {attempt.followUpCheck.note}
                  </p>
                </div>
              ) : (
                <FollowUpForm attemptId={attempt.id} />
              )}
            </div>
          </ScreenSection>

          {stored ? (
            <ScreenSection title="Reference explanation">
              <p className="text-callout whitespace-pre-line">{stored.reference}</p>
              {stored.sources.length > 0 ? (
                <div className="mt-4 rounded-md border border-partial/40 bg-partial/5 px-3.5 py-3">
                  <p className="text-footnote font-semibold">
                    Details here are costly to get wrong. Check them against the official docs:
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {stored.sources.map((source) => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-callout font-semibold underline decoration-rule-strong underline-offset-4 hover:decoration-foreground"
                        >
                          {source.title}
                          <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </ScreenSection>
          ) : null}

          <ScreenSection title="Your explanation">
            {attempt.question ? (
              <p className="mb-2 text-footnote text-muted-foreground">Asked: {attempt.question}</p>
            ) : null}
            <p className="text-callout whitespace-pre-line text-muted-foreground">{attempt.explanation}</p>
          </ScreenSection>
        </>
      )}
    </Screen>
  );
}
