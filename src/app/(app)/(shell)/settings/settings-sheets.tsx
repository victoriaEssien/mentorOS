"use client";

import { ChevronRight } from "lucide-react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { useState, useTransition } from "react";

import { ChoiceGroup, SelectionMark } from "@/components/form/choice-group";
import { FormAlert } from "@/components/form/form-alert";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { goalOptions, learningStyleOptions, toneOptions, weeklyHourOptions } from "@/lib/onboarding-options";
import { cn } from "@/lib/utils";

import { saveNameAction, saveSettingsAction, type SaveState } from "./actions";

const ROW =
  "flex w-full pressable items-center gap-3 px-4 py-3.5 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

/**
 * One setting as a native-style row: its current value at a glance, and a sheet to change it.
 * The sheet's form mounts fresh on every open, so a cancelled edit never lingers.
 */
function SettingSheet({
  label,
  value,
  title,
  description,
  children,
}: {
  label: string;
  value: string;
  title: string;
  description?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button type="button" className={ROW}>
          <span className="shrink-0 text-body">{label}</span>
          <span className="ml-auto min-w-0 truncate text-callout text-muted-foreground">{value}</span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        <div className="max-h-[65dvh] overflow-y-auto px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          {children(() => setOpen(false))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** Runs a save, closes the sheet when it worked, and keeps the sheet open with the reason when not. */
function useSave(close: () => void) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  function save(run: () => Promise<SaveState>) {
    setError(undefined);
    startTransition(async () => {
      const result = await run();
      if (result.error) setError(result.error);
      else close();
    });
  }
  return { pending, error, save };
}

export function NameSetting({ name }: { name: string }) {
  return (
    <SettingSheet label="Name" value={name} title="Your name" description="Your mentor greets you by it.">
      {(close) => <NameForm name={name} close={close} />}
    </SettingSheet>
  );
}

function NameForm({ name, close }: { name: string; close: () => void }) {
  const [draft, setDraft] = useState(name);
  const { pending, error, save } = useSave(close);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(() => saveNameAction(draft));
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-name">Name</Label>
        <Input
          id="settings-name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={80}
          autoComplete="name"
        />
      </div>
      {error ? <FormAlert>{error}</FormAlert> : null}
      <Button type="submit" disabled={pending || !draft.trim() || draft.trim() === name}>
        {pending ? "Saving" : "Save"}
      </Button>
    </form>
  );
}

type Track = { id: string; name: string; description: string | null };

export function TracksSetting({ tracks, selected }: { tracks: Track[]; selected: string[] }) {
  const names = tracks.filter((track) => selected.includes(track.id)).map((track) => track.name);
  return (
    <SettingSheet
      label="Tracks"
      value={names.join(", ") || "None"}
      title="Your tracks"
      description="Your path is planned from these. Changing them plans it again, in about half a minute. Your evidence stays."
    >
      {(close) => <TracksForm tracks={tracks} selected={selected} close={close} />}
    </SettingSheet>
  );
}

function TracksForm({ tracks, selected, close }: { tracks: Track[]; selected: string[]; close: () => void }) {
  const [draft, setDraft] = useState(selected);
  const { pending, error, save } = useSave(close);
  const unchanged = draft.length === selected.length && draft.every((id) => selected.includes(id));
  return (
    <div className="flex flex-col gap-4">
      <ToggleGroupPrimitive.Root
        type="multiple"
        value={draft}
        onValueChange={setDraft}
        aria-label="Tracks"
        className="flex flex-col gap-2"
      >
        {tracks.map((track) => {
          const on = draft.includes(track.id);
          return (
            <ToggleGroupPrimitive.Item
              key={track.id}
              value={track.id}
              className={cn(
                "flex pressable items-center gap-4 rounded-lg border bg-window px-4 py-3.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                on ? "border-foreground" : "border-rule",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-callout font-semibold">{track.name}</span>
                {track.description ? (
                  <span className="mt-0.5 block text-footnote text-muted-foreground">
                    {track.description}
                  </span>
                ) : null}
              </span>
              <SelectionMark selected={on} />
            </ToggleGroupPrimitive.Item>
          );
        })}
      </ToggleGroupPrimitive.Root>
      {error ? <FormAlert>{error}</FormAlert> : null}
      <Button
        disabled={pending || draft.length === 0 || unchanged}
        onClick={() => save(() => saveSettingsAction({ trackIds: draft }))}
      >
        {pending ? "Saving" : draft.length === 0 ? "Pick at least one track" : "Save and replan"}
      </Button>
    </div>
  );
}

export function GoalsSetting({ goals, customGoal }: { goals: string[]; customGoal: string | null }) {
  const all = [...goals, ...(customGoal ? [customGoal] : [])];
  return (
    <SettingSheet
      label="Goals"
      value={all.join(", ") || "None picked"}
      title="What you're working toward"
      description="Your mentor and your missions lean toward these."
    >
      {(close) => <GoalsForm goals={goals} customGoal={customGoal} close={close} />}
    </SettingSheet>
  );
}

function GoalsForm({
  goals,
  customGoal,
  close,
}: {
  goals: string[];
  customGoal: string | null;
  close: () => void;
}) {
  const [draft, setDraft] = useState(goals);
  const [custom, setCustom] = useState(customGoal ?? "");
  const { pending, error, save } = useSave(close);
  return (
    <div className="flex flex-col gap-5">
      <ToggleGroupPrimitive.Root
        type="multiple"
        value={draft}
        onValueChange={setDraft}
        aria-label="Goals"
        className="flex flex-wrap gap-2"
      >
        {goalOptions.map((goal) => (
          <ToggleGroupPrimitive.Item
            key={goal}
            value={goal}
            className="inline-flex h-11 pressable items-center rounded-full border border-rule bg-window px-4 text-callout font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=on]:border-transparent data-[state=on]:bg-signal data-[state=on]:text-signal-foreground"
          >
            {goal}
          </ToggleGroupPrimitive.Item>
        ))}
      </ToggleGroupPrimitive.Root>
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-goal">In your own words (optional)</Label>
        <Input
          id="settings-goal"
          placeholder="For example: get a backend role within a year"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          maxLength={200}
        />
      </div>
      {error ? <FormAlert>{error}</FormAlert> : null}
      <Button
        disabled={pending}
        onClick={() => save(() => saveSettingsAction({ goals: draft, customGoal: custom }))}
      >
        {pending ? "Saving" : "Save"}
      </Button>
    </div>
  );
}

/** A single choice that saves the moment it's picked, the way a native settings list does. */
function ChoiceForm({
  label,
  value,
  options,
  toChanges,
  note,
  close,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; detail?: string }[];
  toChanges: (value: string) => Record<string, unknown>;
  note?: string;
  close: () => void;
}) {
  const [picked, setPicked] = useState(value);
  const { pending, error, save } = useSave(close);
  return (
    <div className="flex flex-col gap-3">
      <ChoiceGroup
        label={label}
        hideLabel
        value={picked}
        disabled={pending}
        onChange={(next) => {
          setPicked(next);
          save(() => saveSettingsAction(toChanges(next)));
        }}
        options={options}
      />
      {note ? <p className="text-footnote text-muted-foreground">{note}</p> : null}
      {error ? <FormAlert>{error}</FormAlert> : null}
    </div>
  );
}

export function WeeklyTimeSetting({ hours }: { hours: number | null }) {
  const current = weeklyHourOptions.find((option) => option.value === hours);
  return (
    <SettingSheet
      label="Time each week"
      value={current?.label ?? "Not set"}
      title="Time each week"
      description="Missions are sized to fit it."
    >
      {(close) => (
        <ChoiceForm
          label="Time each week"
          value={hours === null ? "" : String(hours)}
          options={weeklyHourOptions.map((option) => ({ value: String(option.value), label: option.label }))}
          toChanges={(value) => ({ weeklyLearningHours: Number(value) })}
          close={close}
        />
      )}
    </SettingSheet>
  );
}

export function LearningStyleSetting({ style }: { style: string | null }) {
  return (
    <SettingSheet
      label="Learning style"
      value={style ?? "Not set"}
      title="How you like to learn"
      description="Explanations and missions follow it."
    >
      {(close) => (
        <ChoiceForm
          label="Learning style"
          value={style ?? ""}
          options={learningStyleOptions.map((option) => ({ value: option, label: option }))}
          toChanges={(value) => ({ learningStyle: value })}
          close={close}
        />
      )}
    </SettingSheet>
  );
}

export function ToneSetting({ tone }: { tone: string }) {
  const current = toneOptions.find((option) => option.value === tone);
  return (
    <SettingSheet
      label="Tone"
      value={current?.label ?? "Direct and fair"}
      title="How your mentor talks to you"
    >
      {(close) => (
        <ChoiceForm
          label="Tone"
          value={tone}
          options={toneOptions.map((option) => ({
            value: option.value,
            label: option.label,
            detail: option.detail,
          }))}
          toChanges={(value) => ({ mentorTone: value })}
          note="Whatever you pick, the standards stay the same. Your mentor also eases off when you're stuck and pushes when you're coasting."
          close={close}
        />
      )}
    </SettingSheet>
  );
}
