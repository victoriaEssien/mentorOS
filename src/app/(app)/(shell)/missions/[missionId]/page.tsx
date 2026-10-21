import { ArrowUpRight, LoaderCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NAV_FORWARD } from "@/components/shell/page-transition";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { DifficultyCells } from "@/components/system/difficulty-cells";
import { RichText } from "@/components/system/rich-text";
import { SkillRow } from "@/components/system/skill-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  durationLabel,
  instructionSteps,
  MISSION_STATUS_LABEL,
  missionTypeLabel,
} from "@/lib/mission-labels";
import { getMissionDetail } from "@/server/queries/missions";
import { requireLearner } from "@/server/session";

import { MissionActions } from "../mission-controls";

export const metadata: Metadata = { title: "Mission" };

export default async function MissionPage({ params }: PageProps<"/missions/[missionId]">) {
  const { user } = await requireLearner();
  const { missionId } = await params;

  const detail = await getMissionDetail(user.id, missionId);
  if (!detail) notFound();
  const { mission, skills, evaluation } = detail;

  const duration = durationLabel(mission.estimatedMinutes);
  const steps = instructionSteps(mission.instructions);

  return (
    <Screen>
      <ScreenHeader
        title={mission.title}
        subtitle={`${missionTypeLabel(mission.type)} ${mission.cadence === "weekly" ? "challenge" : "mission"}${duration ? `, ${duration.toLowerCase()}` : ""}.`}
        back={{ href: "/missions", label: "Missions" }}
      />

      <div className="rounded-lg border border-rule bg-window p-5 shadow-window">
        <div className="flex items-center justify-between gap-3">
          {mission.difficulty ? (
            <span className="flex items-center gap-2 text-footnote text-muted-foreground">
              <DifficultyCells level={mission.difficulty} />
              Difficulty {mission.difficulty} of 5
            </span>
          ) : (
            <span />
          )}
          <Badge variant={mission.status === "assigned" ? "signal" : "neutral"}>
            {MISSION_STATUS_LABEL[mission.status]}
          </Badge>
        </div>
        <p className="mt-4 text-body">{mission.objective}</p>
        <div className="mt-5">
          <PrimaryAction missionId={mission.id} status={mission.status} hasEvaluation={Boolean(evaluation)} />
        </div>
      </div>

      <ScreenSection title="Why this, now">
        <p className="text-callout text-muted-foreground">{mission.reason}</p>
      </ScreenSection>

      {mission.requiredKnowledge.length > 0 ? (
        <ScreenSection title="Before you start">
          <ul className="flex flex-col gap-1.5 text-callout">
            {mission.requiredKnowledge.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-[1px] bg-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </ScreenSection>
      ) : null}

      <ScreenSection title="Steps">
        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3.5">
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-sm border border-rule-strong font-mono text-footnote font-semibold"
              >
                {index + 1}
              </span>
              <p className="min-w-0 pt-0.5 text-callout wrap-anywhere">
                <RichText text={step} />
              </p>
            </li>
          ))}
        </ol>
      </ScreenSection>

      <ScreenSection title="Hand in">
        <p className="text-callout">
          <RichText text={mission.deliverable} />
        </p>
      </ScreenSection>

      {mission.evaluationCriteria.length > 0 ? (
        <ScreenSection title="How it's scored">
          <ul className="divide-y divide-rule border-y border-rule">
            {mission.evaluationCriteria.map((criterion) => (
              <li key={criterion.key} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body font-semibold">{criterion.label}</span>
                  <span className="shrink-0 font-mono text-footnote text-muted-foreground tabular-nums">
                    /{criterion.maxScore}
                  </span>
                </div>
                <p className="mt-0.5 text-footnote text-muted-foreground">{criterion.description}</p>
              </li>
            ))}
          </ul>
        </ScreenSection>
      ) : null}

      {mission.resources.length > 0 ? (
        <ScreenSection title="Start here">
          <ul className="flex flex-col gap-2.5">
            {mission.resources.map((resource) => (
              <li key={resource.title}>
                {resource.url ? (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex pressable items-start justify-between gap-3 rounded-lg border border-rule bg-window px-4 py-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <ResourceText resource={resource} />
                    <ArrowUpRight aria-hidden className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" />
                  </a>
                ) : (
                  <div className="rounded-lg border border-rule bg-window px-4 py-3">
                    <ResourceText resource={resource} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </ScreenSection>
      ) : null}

      {skills.length > 0 ? (
        <ScreenSection title="Skills it practises">
          <ul className="divide-y divide-rule border-y border-rule">
            {skills.map((skill) => (
              <li key={skill.id}>
                <SkillRow
                  name={skill.name}
                  estimate={skill.estimate}
                  href={`/profile/skills/${skill.slug}`}
                />
              </li>
            ))}
          </ul>
        </ScreenSection>
      ) : null}

      {mission.status === "assigned" || mission.status === "in_progress" ? (
        <ScreenSection>
          <PrimaryAction missionId={mission.id} status={mission.status} hasEvaluation={false} />
        </ScreenSection>
      ) : null}
    </Screen>
  );
}

function PrimaryAction({
  missionId,
  status,
  hasEvaluation,
}: {
  missionId: string;
  status: "assigned" | "in_progress" | "submitted" | "evaluated" | "skipped";
  hasEvaluation: boolean;
}) {
  if (status === "assigned") return <MissionActions missionId={missionId} status="assigned" />;
  if (status === "in_progress") {
    return (
      <div className="flex flex-col gap-2.5">
        <Button asChild size="lg" className="w-full">
          <Link transitionTypes={NAV_FORWARD} href={`/missions/${missionId}/submit`}>
            Hand in your work
          </Link>
        </Button>
        <MissionActions missionId={missionId} status="in_progress" />
      </div>
    );
  }
  if (status === "submitted") {
    return (
      <p className="flex items-center gap-2 text-callout text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        Being evaluated
      </p>
    );
  }
  if (status === "evaluated" && hasEvaluation) {
    return (
      <Button asChild size="lg" className="w-full">
        <Link transitionTypes={NAV_FORWARD} href={`/missions/${missionId}/evaluation`}>
          See the evaluation
        </Link>
      </Button>
    );
  }
  return <p className="text-callout text-muted-foreground">You skipped this one.</p>;
}

function ResourceText({
  resource,
}: {
  resource: { title: string; url?: string; kind: string; note?: string };
}) {
  const host = resource.url ? new URL(resource.url).hostname.replace(/^www\./, "") : null;
  return (
    <span className="min-w-0">
      <span className="block text-body font-semibold">{resource.title}</span>
      <span className="block text-footnote text-muted-foreground">
        {[host, resource.kind].filter(Boolean).join(", ")}
      </span>
      {resource.note ? <span className="mt-1 block text-footnote">{resource.note}</span> : null}
    </span>
  );
}
