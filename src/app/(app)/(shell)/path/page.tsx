import { Check, ChevronRight, ClipboardList, Lock, Route as RouteIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { NAV_FORWARD } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { AlertCard } from "@/components/system/alert-card";
import { CellMeter } from "@/components/system/cell-meter";
import { abilityLabel, SkillRow } from "@/components/system/skill-row";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOpenDiagnosticId } from "@/server/learning/diagnostic";
import { getPathOverview, type PathOverview } from "@/server/queries/path";
import { requireLearner } from "@/server/session";

import { AskForChange, PlanningPoller, PlanPathButton } from "./path-controls";

export const metadata: Metadata = { title: "Learning path" };

// Replanning runs a model call inside this route's server actions.
export const maxDuration = 120;

type Step = PathOverview["steps"][number];

export default async function LearningPathPage() {
  const { user } = await requireLearner();
  const [overview, openDiagnosticId] = await Promise.all([
    getPathOverview(user.id),
    getOpenDiagnosticId(user.id),
  ]);
  const { active, current, steps, deferred, earlier } = overview;

  if (!active) {
    return (
      <Screen>
        <ScreenHeader title="Path" subtitle="What to work on next, and why." />
        {openDiagnosticId ? (
          <AlertCard
            icon={<ClipboardList aria-hidden />}
            title="Your path starts with the diagnostic"
            actions={
              <Button asChild>
                <Link transitionTypes={NAV_FORWARD} href={`/assessments/${openDiagnosticId}`}>
                  Continue the diagnostic
                </Link>
              </Button>
            }
          >
            I plan from evidence, not from what anyone says they know. Finish the diagnostic and your first
            path follows.
          </AlertCard>
        ) : overview.firstPathOnItsWay ? (
          <div role="status" className="rounded-lg border border-rule bg-window p-5 shadow-window">
            <PlanningPoller />
            <CellMeter
              value={1}
              label="Planning your path"
              animate
              className="[&>span]:h-3 [&>span]:[animation-direction:alternate] [&>span]:[animation-iteration-count:infinite]"
            />
            <p className="mt-5 text-headline">Planning your path</p>
            <p className="mt-1 text-callout text-muted-foreground">
              I&apos;m working out what comes first from your diagnostic. This takes about half a minute.
            </p>
          </div>
        ) : (
          <AlertCard icon={<RouteIcon aria-hidden />} title="No path yet" tone="neutral">
            <span className="mb-4 block">
              I&apos;ll plan one from the evidence I have. It takes about half a minute.
            </span>
            <PlanPathButton />
          </AlertCard>
        )}
      </Screen>
    );
  }

  const next = steps.filter((step) => step !== current);

  return (
    <Screen>
      <ScreenHeader
        title="Path"
        subtitle={`Planned ${when(active.createdAt)}${active.request ? ", after you asked for a change" : " from your evidence"}.`}
      />

      <p className="text-body">{active.focusSummary}</p>

      {current ? (
        <ScreenSection title="Now" className="mt-6">
          <FocusCard step={current} number={steps.indexOf(current) + 1} />
        </ScreenSection>
      ) : null}

      {next.length > 0 ? (
        <ScreenSection title="Next">
          <ol className="divide-y divide-rule border-y border-rule">
            {next.map((step) => (
              <li key={step.id}>
                <StepRow step={step} number={steps.indexOf(step) + 1} />
              </li>
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

/** The current focus: the one thing to work on now, with its skill and its reason. */
function FocusCard({ step, number }: { step: Step; number: number }) {
  return (
    <div className="rounded-lg border border-rule bg-window p-5 shadow-window">
      <div className="flex gap-3.5">
        <StepMarker status="current" number={number} />
        <div className="min-w-0 flex-1">
          <h3 className="text-headline">{step.title}</h3>
          <p className="mt-1.5 text-callout text-muted-foreground">{step.reason}</p>
        </div>
      </div>
      {step.skill ? (
        <div className="mt-4 border-t border-rule">
          <SkillRow
            name={step.skill.name}
            estimate={step.estimate}
            href={`/profile/skills/${step.skill.slug}`}
          />
        </div>
      ) : null}
    </div>
  );
}

function StepRow({ step, number }: { step: Step; number: number }) {
  const body = (
    <>
      <StepMarker status={step.status} number={number} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-headline", step.status === "completed" && "text-muted-foreground")}>
          {step.title}
        </span>
        <span className="mt-1 block text-callout text-muted-foreground">{step.reason}</span>
        {step.skill ? (
          <span className="mt-2 block text-footnote text-muted-foreground">
            {step.skill.name}:{" "}
            {step.estimate ? abilityLabel(step.estimate.ability).toLowerCase() : "not measured yet"}
          </span>
        ) : null}
      </span>
      {step.skill ? (
        <ChevronRight aria-hidden className="mt-1 size-4.5 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  );

  return step.skill ? (
    <Link
      transitionTypes={NAV_FORWARD}
      href={`/profile/skills/${step.skill.slug}`}
      className="flex pressable gap-3.5 py-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {body}
    </Link>
  ) : (
    <div className="flex gap-3.5 py-4">{body}</div>
  );
}

/** A step's place in the path as a cell: signal yellow for now, ink for done, hollow for later. */
function StepMarker({ status, number }: { status: Step["status"]; number: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-sm font-mono text-footnote font-semibold",
        status === "current" && "bg-signal text-signal-foreground",
        status === "completed" && "bg-foreground text-background",
        status === "upcoming" && "border border-rule-strong",
      )}
    >
      {status === "completed" ? <Check className="size-4" /> : number}
    </span>
  );
}

function when(date: Date) {
  const day = (value: Date) => Math.floor(value.getTime() / 86_400_000);
  const daysAgo = day(new Date()) - day(date);
  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "yesterday";
  return `on ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
}
