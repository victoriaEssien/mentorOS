import { ArrowUpRight, Check, ChevronRight, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Pip } from "@/components/brand/pip";
import { NAV_FORWARD } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { PipPanel } from "@/components/system/pip-panel";
import { SkillRow } from "@/components/system/skill-row";
import { abilityLabel } from "@/lib/skill-labels";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOpenDiagnosticId } from "@/server/learning/diagnostic";
import { getMissionsOverview, type MissionsOverview } from "@/server/queries/missions";
import { getPathOverview, type PathOverview } from "@/server/queries/path";
import { requireLearner } from "@/server/session";

import { AskForChange, PlanningPoller, PlanPathButton } from "./path-controls";

export const metadata: Metadata = { title: "Learning path" };

// Replanning runs a model call inside this route's server actions.
export const maxDuration = 120;

type Step = PathOverview["steps"][number];
type Practice = NonNullable<MissionsOverview["daily"]>;

export default async function LearningPathPage() {
  const { user } = await requireLearner();
  const [overview, openDiagnosticId, missions] = await Promise.all([
    getPathOverview(user.id),
    getOpenDiagnosticId(user.id),
    getMissionsOverview(user.id),
  ]);
  const { active, current, steps, deferred, earlier } = overview;

  if (!active) {
    return (
      <Screen>
        <ScreenHeader title="Path" subtitle="What to work on next, and why." />
        {openDiagnosticId ? (
          <PipPanel
            title="Your path starts with the diagnostic"
            action={
              <Button asChild>
                <Link transitionTypes={NAV_FORWARD} href={`/assessments/${openDiagnosticId}`}>
                  Continue the diagnostic
                </Link>
              </Button>
            }
          >
            I plan from evidence, not from what anyone says they know. Finish the diagnostic and your first
            path follows.
          </PipPanel>
        ) : overview.firstPathOnItsWay ? (
          <PipPanel mood="thinking" title="Planning your path" status>
            <PlanningPoller />
            I&apos;m working out what comes first from your diagnostic. This takes about half a minute.
          </PipPanel>
        ) : (
          <PipPanel mood="asleep" title="No path yet" action={<PlanPathButton />}>
            I&apos;ll plan one from the evidence I have. It takes about half a minute.
          </PipPanel>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Path"
        subtitle={`Planned ${when(active.createdAt)}${active.request ? ", after you asked for a change" : " from your evidence"}.`}
      />

      <p className="text-body">{active.focusSummary}</p>

      {steps.length > 0 ? (
        <ScreenSection title="Steps" className="mt-6">
          <ol className="rounded-xl bg-raised bg-dots p-4">
            {steps.map((step, index) => (
              <TimelineStep
                key={step.id}
                step={step}
                number={index + 1}
                current={step === current}
                practice={missions.daily}
                before={steps[index - 1]}
                last={index === steps.length - 1}
              />
            ))}
          </ol>
        </ScreenSection>
      ) : null}

      {deferred.length > 0 ? (
        <ScreenSection title="Not yet">
          <ul className="flex flex-col gap-2.5">
            {deferred.map((item) => (
              <li
                key={item.id}
                className="flex gap-3.5 rounded-lg border border-dashed border-rule-strong p-4"
              >
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded-sm border border-rule-strong text-muted-foreground"
                >
                  <Lock className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-headline">{item.title}</p>
                  <p className="mt-1 text-callout text-muted-foreground">{item.reason}</p>
                  {item.unlockWhen ? (
                    <p className="mt-2 text-footnote">
                      <span className="font-semibold">Unlocks when: </span>
                      {item.unlockWhen}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </ScreenSection>
      ) : null}

      <ScreenSection>
        <AskForChange />
      </ScreenSection>

      {earlier.length > 0 ? (
        <ScreenSection title="How this path changed">
          <ol className="divide-y divide-rule border-y border-rule">
            {earlier.map((path) => (
              <li key={path.id} className="grid grid-cols-[3.5rem_1fr] gap-x-3 py-3">
                <span className="pt-0.5 font-mono text-caption text-muted-foreground tabular-nums">
                  {path.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-3 text-footnote">{path.focusSummary}</p>
                  {path.request ? (
                    <p className="mt-1 text-footnote text-muted-foreground">
                      You asked: &ldquo;{path.request}&rdquo;
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </ScreenSection>
      ) : null}
    </Screen>
  );
}

/**
 * One step on the timeline: its cell, the line to the steps around it (solid where the learner
 * has been, dashed ahead), and what it is and why. The current step is a window Pip stands on.
 */
function TimelineStep({
  step,
  number,
  current,
  practice,
  before,
  last,
}: {
  step: Step;
  number: number;
  current: boolean;
  /** Today's mission, which practises the current step. */
  practice: Practice | null;
  before: Step | undefined;
  last: boolean;
}) {
  // Room above the current step for Pip to stand on its window, even when it is the first step.
  const lead = current ? "h-12" : before ? "h-5" : "h-0";

  return (
    <li className="flex gap-3.5">
      <div aria-hidden className="flex w-11 shrink-0 flex-col items-center">
        <Connector traveled={before?.status === "completed"} className={cn(lead, !before && "invisible")} />
        <StepCell status={step.status} number={number} />
        {last ? null : <Connector traveled={step.status === "completed"} className="min-h-0 flex-1" />}
      </div>
      <div className={cn("min-w-0 flex-1", current ? "pt-12" : before && "pt-5")}>
        {current ? <CurrentStep step={step} practice={practice} /> : <StepText step={step} />}
      </div>
    </li>
  );
}

function Connector({ traveled, className }: { traveled: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "w-1 rounded-full",
        traveled
          ? "bg-foreground"
          : "bg-[linear-gradient(var(--color-rule-strong)_55%,transparent_55%)] bg-size-[4px_9px]",
        className,
      )}
    />
  );
}

/** A step's place in the path as a cell: ink with a check for done, signal yellow for now, hollow for later. */
function StepCell({ status, number }: { status: Step["status"]; number: number }) {
  return (
    <span
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-md font-mono text-callout font-semibold",
        status === "current" &&
          "border-2 border-foreground bg-signal text-signal-foreground shadow-[0_3px_0_var(--color-foreground)]",
        status === "completed" && "bg-foreground text-signal",
        status === "upcoming" && "border-2 border-rule-strong bg-window text-muted-foreground",
      )}
    >
      {status === "completed" ? <Check className="size-5" strokeWidth={3} /> : number}
    </span>
  );
}

/**
 * The current focus: the one thing to work on now, with its reason and its skill, and how to work
 * on it: today's mission and the reading it starts from, or a way to get one.
 */
function CurrentStep({ step, practice }: { step: Step; practice: Practice | null }) {
  const reading = practice?.resources.filter((resource) => resource.url) ?? [];
  return (
    <div className="relative rounded-lg border-2 border-foreground bg-window p-4 shadow-window dark:border-rule-strong">
      <Pip size={48} label="Pip, on your current step" className="absolute -top-10.5 right-3" />
      <p className="text-caption font-semibold text-muted-foreground">You&apos;re here</p>
      <h3 className="mt-0.5 text-headline">{step.title}</h3>
      <p className="mt-1.5 text-callout text-muted-foreground">{step.reason}</p>
      {step.skill ? (
        <div className="mt-3 border-t border-rule">
          <SkillRow
            name={step.skill.name}
            estimate={step.estimate}
            href={`/profile/skills/${step.skill.slug}`}
          />
        </div>
      ) : null}

      <div className="mt-1 border-t border-rule pt-3">
        <p className="text-caption font-semibold text-muted-foreground">Practise it</p>
        {practice ? (
          <>
            <Link
              transitionTypes={NAV_FORWARD}
              href={`/missions/${practice.id}`}
              className="mt-1 flex pressable items-center justify-between gap-3 rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="min-w-0">
                <span className="block text-headline">{practice.title}</span>
                <span className="block text-footnote text-muted-foreground">Today&apos;s mission</span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            </Link>
            {reading.length > 0 ? (
              <>
                <p className="mt-3 text-caption font-semibold text-muted-foreground">Start here</p>
                <ul className="mt-1.5 flex flex-col gap-2">
                  {reading.map((resource) => (
                    <li key={resource.url}>
                      <a
                        href={resource.url!}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-callout font-semibold underline decoration-rule-strong underline-offset-4 hover:decoration-foreground"
                      >
                        {resource.title}
                        <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      </a>
                      {resource.note ? (
                        <span className="block text-footnote text-muted-foreground">{resource.note}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : (
          <Link
            transitionTypes={NAV_FORWARD}
            href="/missions"
            className="mt-1 inline-flex items-center gap-1 text-callout font-semibold underline decoration-rule-strong underline-offset-4 hover:decoration-foreground"
          >
            Get a mission for this step
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

function StepText({ step }: { step: Step }) {
  const body = (
    <>
      <span className={cn("block text-headline", step.status === "completed" && "text-muted-foreground")}>
        {step.title}
      </span>
      <span className="mt-1 block text-callout text-muted-foreground">{step.reason}</span>
      {step.skill ? (
        <span className="mt-1.5 flex items-center gap-0.5 text-footnote text-muted-foreground">
          {step.skill.name}:{" "}
          {step.estimate ? abilityLabel(step.estimate.ability).toLowerCase() : "not measured yet"}
          <ChevronRight aria-hidden className="size-4" />
        </span>
      ) : null}
    </>
  );

  return step.skill ? (
    <Link
      transitionTypes={NAV_FORWARD}
      href={`/profile/skills/${step.skill.slug}`}
      className="block pressable rounded-sm pt-2.5 pb-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {body}
    </Link>
  ) : (
    <div className="pt-2.5 pb-1">{body}</div>
  );
}

function when(date: Date) {
  const day = (value: Date) => Math.floor(value.getTime() / 86_400_000);
  const daysAgo = day(new Date()) - day(date);
  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "yesterday";
  return `on ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
}
