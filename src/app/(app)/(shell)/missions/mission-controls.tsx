"use client";

import { Play, SkipForward } from "lucide-react";
import { startTransition, useActionState, useState } from "react";

import { Pip } from "@/components/brand/pip";
import { FormAlert } from "@/components/form/form-alert";
import { SubmitButton } from "@/components/form/submit-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { getMissionAction, skipMissionAction, startMissionAction } from "./actions";

/**
 * "Get today's mission": writing one takes the model about half a minute, so the panel says so
 * while it works, then opens the new mission.
 */
export function GetMissionPanel({
  cadence,
  title,
  description,
  action,
}: {
  cadence: "daily" | "weekly";
  title: string;
  description: string;
  action: string;
}) {
  const [state, formAction, pending] = useActionState(getMissionAction.bind(null, cadence), {});

  if (pending) {
    return (
      <div
        role="status"
        className="flex items-start gap-4 rounded-lg border border-rule bg-window p-5 shadow-window"
      >
        <Pip mood="thinking" size={52} />
        <div className="min-w-0">
          <p className="text-headline">Writing your mission</p>
          <p className="mt-1 text-callout text-muted-foreground">
            Pitched at your current level for this skill. This takes about half a minute.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-lg border border-rule bg-window p-5 shadow-window">
      <div className="flex items-start gap-4">
        <Pip size={52} />
        <div className="min-w-0">
          <p className="text-headline">{title}</p>
          <p className="mt-1 text-callout text-muted-foreground">{description}</p>
        </div>
      </div>
      {state.error ? <FormAlert className="mt-4">{state.error}</FormAlert> : null}
      <SubmitButton className="mt-4 w-full">{action}</SubmitButton>
    </form>
  );
}

/** Start, or skip with a confirmation that says skipping isn't held against them. */
export function MissionActions({
  missionId,
  status,
}: {
  missionId: string;
  status: "assigned" | "in_progress";
}) {
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [starting, setStarting] = useState(false);

  return (
    <div className="flex gap-2.5">
      <Button variant="secondary" className="shrink-0" onClick={() => setConfirmSkip(true)}>
        <SkipForward aria-hidden />
        Skip
      </Button>
      {status === "assigned" ? (
        <Button
          className="flex-1"
          disabled={starting}
          onClick={() => {
            setStarting(true);
            startTransition(() => startMissionAction(missionId));
          }}
        >
          <Play aria-hidden />
          Start mission
        </Button>
      ) : null}

      <AlertDialog open={confirmSkip} onOpenChange={setConfirmSkip}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <SkipForward aria-hidden />
            </AlertDialogMedia>
            <AlertDialogTitle>Skip this mission?</AlertDialogTitle>
            <AlertDialogDescription>
              It won&apos;t count against you. I&apos;ll write a different one when you&apos;re ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => startTransition(() => skipMissionAction(missionId))}>
              Skip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
