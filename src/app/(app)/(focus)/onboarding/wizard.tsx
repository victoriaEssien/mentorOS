"use client";

import { Check, ChevronLeft, Plus, X } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive, ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { startTransition, useActionState, useState } from "react";

import { FormAlert } from "@/components/form/form-alert";
import { CellMeter } from "@/components/system/cell-meter";
import { WorkingScreen } from "@/components/system/working-screen";
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

type Track = { id: string; name: string; description: string | null };

const STEPS = ["tracks", "goals", "background", "preferences", "review"] as const;

const emptyAnswers: OnboardingAnswers = {
  trackIds: [],
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
  tracks,
  initial,
}: {
  tracks: Track[];
  initial: Partial<OnboardingAnswers>;
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [answers, setAnswers] = useState<OnboardingAnswers>({ ...emptyAnswers, ...initial });
  const [state, submit, pending] = useActionState(completeOnboardingAction, {});

  const update = (patch: Partial<OnboardingAnswers>) => setAnswers((current) => ({ ...current, ...patch }));
  const current = STEPS[step];
  const valid = current !== "tracks" || answers.trackIds.length > 0;
  const last = step === STEPS.length - 1;

  function go(delta: 1 | -1) {
    setDirection(delta === 1 ? "forward" : "back");
    setStep((value) => Math.min(STEPS.length - 1, Math.max(0, value + delta)));
    window.scrollTo({ top: 0 });
  }

  function finish() {
    startTransition(() => submit(answers));
  }

  const selectedTrackNames = tracks.filter((track) => answers.trackIds.includes(track.id)).map((t) => t.name);

  if (pending) return <BuildingScreen trackNames={selectedTrackNames} />;

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
          {current === "tracks" && <TracksStep tracks={tracks} answers={answers} update={update} />}
          {current === "goals" && <GoalsStep answers={answers} update={update} />}
          {current === "background" && <BackgroundStep answers={answers} update={update} />}
          {current === "preferences" && <PreferencesStep answers={answers} update={update} />}
          {current === "review" && <ReviewStep answers={answers} trackNames={selectedTrackNames} />}
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-window pb-safe">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 py-3">
          {last && state.error ? <FormAlert>{state.error}</FormAlert> : null}
          <Button size="lg" className="w-full" disabled={!valid} onClick={last ? finish : () => go(1)}>
            {last ? "Start my assessment" : "Continue"}
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

function TracksStep({ tracks, answers, update }: StepProps & { tracks: Track[] }) {
  return (
    <>
      <StepTitle
        title="What do you want to get better at?"
        detail="Pick one or more. Missions can combine them later."
      />
      <ToggleGroupPrimitive.Root
        type="multiple"
        value={answers.trackIds}
        onValueChange={(trackIds) => update({ trackIds })}
        aria-label="Tracks"
        className="flex flex-col gap-2"
      >
        {tracks.map((track) => {
          const selected = answers.trackIds.includes(track.id);
          return (
            <ToggleGroupPrimitive.Item
              key={track.id}
              value={track.id}
              className={cn(
                "flex pressable items-center gap-4 rounded-lg border bg-window px-4 py-3.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected ? "border-foreground" : "border-rule",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-headline">{track.name}</span>
                {track.description ? (
                  <span className="mt-0.5 block text-footnote text-muted-foreground">
                    {track.description}
                  </span>
                ) : null}
              </span>
              <SelectionMark selected={selected} />
            </ToggleGroupPrimitive.Item>
          );
        })}
      </ToggleGroupPrimitive.Root>
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
        detail="This helps the mentor talk to you at the right level. It doesn't set your skill levels; the assessment does."
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
          label="Experience in your chosen tracks"
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

function ReviewStep({ answers, trackNames }: { answers: OnboardingAnswers; trackNames: string[] }) {
  const goals = [...answers.goals, ...(answers.customGoal ? [answers.customGoal] : [])];
  const tone = toneOptions.find((option) => option.value === answers.mentorTone)?.label;
  const hours = weeklyHourOptions.find((option) => option.value === answers.weeklyLearningHours)?.label;

  return (
    <>
      <StepTitle
        title="Next, find out what you actually know."
        detail="A short assessment of real questions: code to read, problems to reason through, a few things to explain. About 20 minutes. Answer honestly; guesses only send you down the wrong path."
      />
      <dl className="divide-y divide-rule rounded-lg border border-rule bg-window">
        <ReviewRow term="Tracks" detail={trackNames.join(", ")} />
        <ReviewRow term="Goals" detail={goals.length > 0 ? goals.join(", ") : "None picked"} />
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

/** Single choice as a list of tappable rows (or a two-column grid for short labels). */
function ChoiceGroup({
  label,
  value,
  onChange,
  options,
  columns = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; detail?: string }[];
  columns?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-footnote font-semibold">{label}</legend>
      <RadioGroupPrimitive.Root
        value={value}
        onValueChange={onChange}
        className={cn("grid gap-2", columns && "grid-cols-2")}
      >
        {options.map((option) => (
          <RadioGroupPrimitive.Item
            key={option.value}
            value={option.value}
            className="flex pressable items-center gap-3 rounded-lg border border-rule bg-window px-4 py-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=checked]:border-foreground"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-callout font-semibold">{option.label}</span>
              {option.detail ? (
                <span className="mt-0.5 block text-footnote text-muted-foreground">{option.detail}</span>
              ) : null}
            </span>
            <RadioGroupPrimitive.Indicator className="grid size-5.5 shrink-0 place-items-center rounded-full bg-signal text-signal-foreground">
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            </RadioGroupPrimitive.Indicator>
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
    </fieldset>
  );
}

/** Outline at rest, signal-filled when chosen. */
function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-sm border-[1.5px] transition-colors",
        selected ? "border-foreground bg-signal text-signal-foreground" : "border-input",
      )}
    >
      {selected ? <Check className="size-4" strokeWidth={3} /> : null}
    </span>
  );
}

/** Shown while the diagnostic is being written. Honest about what is happening and how long it takes. */
function BuildingScreen({ trackNames }: { trackNames: string[] }) {
  return (
    <WorkingScreen title="Building your assessment">
      Writing questions for {trackNames.join(" and ") || "your tracks"}, from recall up to problems you
      haven&apos;t seen before. This takes about a minute; keep this screen open.
    </WorkingScreen>
  );
}
