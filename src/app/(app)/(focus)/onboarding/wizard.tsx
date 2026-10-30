"use client";

import { ChevronLeft, Plus, X } from "lucide-react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { startTransition, useActionState, useState } from "react";

import { PipSays } from "@/components/brand/pip";
import { ChoiceGroup } from "@/components/form/choice-group";
import { FormAlert } from "@/components/form/form-alert";
import { CellMeter } from "@/components/system/cell-meter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  experienceOptions,
  goalOptions,
  learningStyleOptions,
  technologySuggestions,
  toneOptions,
  weeklyHourOptions,
} from "@/lib/onboarding-options";
import { cn } from "@/lib/utils";

import { completeOnboardingAction, type OnboardingAnswers } from "./actions";

type Theme = { title: string; weeks: number; summary: string };

const STEPS = ["how", "goals", "background", "preferences", "review"] as const;

const emptyAnswers: OnboardingAnswers = {
  goals: [],
  customGoal: null,
  currentRole: null,
  yearsExperience: null,
  technologiesUsed: [],
  previousLearning: null,
  existingProjects: null,
  weeklyLearningHours: null,
  learningStyle: null,
  mentorTone: "balanced",
};

export function OnboardingWizard({
  themes,
  initial,
}: {
  /** The first few themes, so they see where the weeks start. */
  themes: Theme[];
  initial: Partial<OnboardingAnswers>;
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [answers, setAnswers] = useState<OnboardingAnswers>({ ...emptyAnswers, ...initial });
  const [state, submit, pending] = useActionState(completeOnboardingAction, {});

  const update = (patch: Partial<OnboardingAnswers>) => setAnswers((current) => ({ ...current, ...patch }));
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  function go(delta: 1 | -1) {
    setDirection(delta === 1 ? "forward" : "back");
    setStep((value) => Math.min(STEPS.length - 1, Math.max(0, value + delta)));
    window.scrollTo({ top: 0 });
  }

  function finish() {
    startTransition(() => submit(answers));
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 bg-background pt-safe">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center gap-3 px-3">
          {step > 0 ? (
            <Button variant="ghost" size="icon" aria-label="Back" onClick={() => go(-1)}>
              <ChevronLeft className="size-6" />
            </Button>
          ) : (
            <span className="size-11" aria-hidden />
          )}
          <CellMeter
            value={(step + 1) / STEPS.length}
            label={`Step ${step + 1} of ${STEPS.length}`}
            className="flex-1 [&>span]:h-1.5"
          />
          <span className="w-9 text-right text-footnote text-muted-foreground tabular-nums">
            {step + 1}/{STEPS.length}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-36">
        <div
          key={current}
          className={cn(
            "animate-in duration-300 fade-in",
            direction === "forward" ? "slide-in-from-right-6" : "slide-in-from-left-6",
          )}
        >
          {current === "how" && <HowStep themes={themes} />}
          {current === "goals" && <GoalsStep answers={answers} update={update} />}
          {current === "background" && <BackgroundStep answers={answers} update={update} />}
          {current === "preferences" && <PreferencesStep answers={answers} update={update} />}
          {current === "review" && <ReviewStep answers={answers} />}
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-window pb-safe">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 py-3">
          {last && state.error ? <FormAlert>{state.error}</FormAlert> : null}
          <Button size="lg" className="w-full" disabled={pending} onClick={last ? finish : () => go(1)}>
            {last ? (pending ? "Starting" : "Start my first week") : "Continue"}
          </Button>
        </div>
      </footer>
    </div>
  );
}

type StepProps = {
  answers: OnboardingAnswers;
  update: (patch: Partial<OnboardingAnswers>) => void;
};

function StepTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-display">{title}</h1>
      <p className="mt-2 text-callout text-muted-foreground">{detail}</p>
    </div>
  );
}

/** How it works: a theme a week, a concept a day to research and explain, and a project per theme. */
function HowStep({ themes }: { themes: Theme[] }) {
  return (
    <>
      <PipSays className="mb-6">
        Hi, I&apos;m Pip. I pick what you work on. You research it, explain it and build it your own way, and
        I tell you straight how it went.
      </PipSays>
      <StepTitle
        title="How it works"
        detail="Every week has a theme, chosen for you, each building on the last."
      />
      <ul className="divide-y divide-rule rounded-lg border border-rule bg-window">
        {[
          {
            title: "A concept a day",
            detail:
              "One new idea from the week's theme. Research it however you like, then explain it back in writing.",
          },
          {
            title: "Reviews that come back",
            detail: "Concepts you're shaky on come back sooner, asked a new way, until they stick.",
          },
          {
            title: "A project per theme",
            detail:
              "Something real to build in a week or two. Hand in the repo; it's reviewed against the brief.",
          },
          {
            title: "Something to post",
            detail:
              "Each project ends with a draft for X and LinkedIn about what you built and what was hard.",
          },
        ].map((part) => (
          <li key={part.title} className="px-4 py-3.5">
            <p className="text-headline">{part.title}</p>
            <p className="mt-0.5 text-footnote text-muted-foreground">{part.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-caption font-semibold text-muted-foreground">Where the weeks start</p>
      <ol className="mt-2 flex flex-col gap-1.5 text-callout">
        {themes.map((theme) => (
          <li key={theme.title}>
            {theme.title}
            <span className="text-muted-foreground">, {theme.weeks === 2 ? "two weeks" : "one week"}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

function GoalsStep({ answers, update }: StepProps) {
  return (
    <>
      <StepTitle
        title="What are you working toward?"
        detail="Pick any that fit, or say it in your own words."
      />
      <ToggleGroupPrimitive.Root
        type="multiple"
        value={answers.goals as string[]}
        onValueChange={(goals) => update({ goals: goals as OnboardingAnswers["goals"] })}
        aria-label="Goals"
        className="flex flex-wrap gap-2"
      >
        {goalOptions.map((goal) => (
          <ToggleGroupPrimitive.Item
            key={goal}
            value={goal}
            className="inline-flex h-11 pressable items-center gap-1.5 rounded-full border border-rule bg-window px-4 text-callout font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=on]:border-transparent data-[state=on]:bg-signal data-[state=on]:text-signal-foreground"
          >
            {goal}
          </ToggleGroupPrimitive.Item>
        ))}
      </ToggleGroupPrimitive.Root>
      <div className="mt-6 flex flex-col gap-2">
        <Label htmlFor="custom-goal">In your own words (optional)</Label>
        <Input
          id="custom-goal"
          placeholder="For example: get a backend role within a year"
          value={answers.customGoal ?? ""}
          onChange={(event) => update({ customGoal: event.target.value })}
          maxLength={200}
        />
      </div>
    </>
  );
}

function BackgroundStep({ answers, update }: StepProps) {
  const [draft, setDraft] = useState("");
  const technologies = answers.technologiesUsed;

  function addTechnology(value: string) {
    const name = value.trim();
    if (!name || technologies.some((t) => t.toLowerCase() === name.toLowerCase())) return;
    update({ technologiesUsed: [...technologies, name] });
  }

  function removeTechnology(name: string) {
    update({ technologiesUsed: technologies.filter((t) => t !== name) });
  }

  return (
    <>
      <StepTitle
        title="Where are you starting from?"
        detail="This helps the mentor talk to you at the right level, and pitches your projects."
      />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">What do you do now? (optional)</Label>
          <Input
            id="role"
            placeholder="Student, frontend developer, analyst…"
            value={answers.currentRole ?? ""}
            onChange={(event) => update({ currentRole: event.target.value })}
            maxLength={120}
          />
        </div>

        <ChoiceGroup
          label="Experience as a developer"
          value={answers.yearsExperience === null ? "" : String(answers.yearsExperience)}
          onChange={(value) => update({ yearsExperience: Number(value) })}
          options={experienceOptions.map((option) => ({ value: String(option.value), label: option.label }))}
          columns
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="technology">Technologies and tools you&apos;ve used</Label>
          {technologies.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Added technologies">
              {technologies.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => removeTechnology(name)}
                    aria-label={`Remove ${name}`}
                    className="inline-flex h-9 pressable items-center gap-1.5 rounded-full bg-foreground pr-2.5 pl-3.5 text-footnote font-semibold text-background outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {name}
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              addTechnology(draft);
              setDraft("");
            }}
          >
            <Input
              id="technology"
              placeholder="Type one and press add"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={40}
              autoCapitalize="none"
            />
            <Button type="submit" variant="secondary" size="icon" aria-label="Add technology">
              <Plus />
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {technologySuggestions
              .filter((name) => !technologies.includes(name))
              .map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addTechnology(name)}
                  className="inline-flex h-9 pressable items-center gap-1 rounded-full border border-dashed border-rule-strong px-3 text-footnote font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Plus className="size-3.5" aria-hidden />
                  {name}
                </button>
              ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="previous-learning">How have you learned so far? (optional)</Label>
          <Textarea
            id="previous-learning"
            placeholder="Courses, a degree, tutorials, on the job…"
            value={answers.previousLearning ?? ""}
            onChange={(event) => update({ previousLearning: event.target.value })}
            maxLength={1000}
            className="min-h-20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="projects">Anything you&apos;ve built? (optional)</Label>
          <Textarea
            id="projects"
            placeholder="A link or a sentence about each project"
            value={answers.existingProjects ?? ""}
            onChange={(event) => update({ existingProjects: event.target.value })}
            maxLength={1000}
            className="min-h-20"
          />
        </div>
      </div>
    </>
  );
}

function PreferencesStep({ answers, update }: StepProps) {
  return (
    <>
      <StepTitle title="How do you like to learn?" detail="You can change all of this later in Settings." />
      <div className="flex flex-col gap-7">
        <ChoiceGroup
          label="Time each week"
          value={answers.weeklyLearningHours === null ? "" : String(answers.weeklyLearningHours)}
          onChange={(value) => update({ weeklyLearningHours: Number(value) })}
          options={weeklyHourOptions.map((option) => ({ value: String(option.value), label: option.label }))}
          columns
        />
        <ChoiceGroup
          label="Learning style"
          value={answers.learningStyle ?? ""}
          onChange={(value) => update({ learningStyle: value as OnboardingAnswers["learningStyle"] })}
          options={learningStyleOptions.map((option) => ({ value: option, label: option }))}
        />
        <div>
          <ChoiceGroup
            label="How should your mentor talk to you?"
            value={answers.mentorTone}
            onChange={(value) => update({ mentorTone: value as OnboardingAnswers["mentorTone"] })}
            options={toneOptions.map((option) => ({
              value: option.value,
              label: option.label,
              detail: option.detail,
            }))}
          />
          <p className="mt-2.5 text-footnote text-muted-foreground">
            Whatever you pick, the standards stay the same. The mentor also eases off when you&apos;re stuck
            and pushes when you&apos;re coasting.
          </p>
        </div>
      </div>
    </>
  );
}

function ReviewStep({ answers }: { answers: OnboardingAnswers }) {
  const goals = [...answers.goals, ...(answers.customGoal ? [answers.customGoal] : [])];
  const tone = toneOptions.find((option) => option.value === answers.mentorTone)?.label;
  const hours = weeklyHourOptions.find((option) => option.value === answers.weeklyLearningHours)?.label;

  return (
    <>
      <StepTitle
        title="Your first week starts today."
        detail="Your first concept is on Today, and the week's project is written for you when you get there. Projects lean on the technologies you listed."
      />
      <dl className="divide-y divide-rule rounded-lg border border-rule bg-window">
        <ReviewRow term="Goals" detail={goals.length > 0 ? goals.join(", ") : "None picked"} />
        <ReviewRow term="Stack" detail={answers.technologiesUsed.join(", ") || "None listed"} />
        <ReviewRow term="Time" detail={hours ?? "Not set"} />
        <ReviewRow term="Mentor" detail={tone ?? "Direct and fair"} />
      </dl>
    </>
  );
}

function ReviewRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-3 px-4 py-3">
      <dt className="text-footnote font-semibold text-muted-foreground">{term}</dt>
      <dd className="text-callout">{detail}</dd>
    </div>
  );
}
