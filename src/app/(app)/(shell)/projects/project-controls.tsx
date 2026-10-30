"use client";

import { Play, SkipForward } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

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

import { nextProjectAction, skipMissionAction, startMissionAction } from "./actions";

/**
 * When there's no project in play. Normally the next one is written straight away (`auto`): the app
 * hands it over, the learner doesn't ask. After one ran out of time it says so first and waits for
 * the button. Writing takes the model about half a minute, so the panel says so while it works.
 */
export function NextProjectPanel({ auto, overTitle }: { auto: boolean; overTitle?: string | null }) {
  const [state, dispatch, pending] = useActionState(nextProjectAction, {});
  const started = useRef(false);

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    startTransition(() => dispatch());
  }, [auto, dispatch]);

  if (pending || (auto && !state.error)) {
    return (
      <div
        role="status"
        className="flex items-start gap-4 rounded-lg border border-rule bg-window p-5 shadow-window"
      >
        <Pip mood="thinking" size={52} />
        <div className="min-w-0">
          <p className="text-headline">Writing your next project</p>
          <p className="mt-1 text-callout text-muted-foreground">
            Something real to build, in a stack picked for you, sized to the weeks it needs. About half a
            minute.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={dispatch} className="rounded-lg border border-rule bg-window p-5 shadow-window">
      <div className="flex items-start gap-4">
        <Pip mood={overTitle ? "notYet" : "idle"} size={52} />
        <div className="min-w-0">
          <p className="text-headline">{overTitle ? "Project over" : "Your next project"}</p>
          <p className="mt-1 text-callout text-muted-foreground">
            {overTitle
              ? `Time ran out on "${overTitle}" before you handed it in. It's recorded as missed.`
              : "Something real to build, in a stack picked for you."}
          </p>
        </div>
      </div>
      {state.error ? <FormAlert className="mt-4">{state.error}</FormAlert> : null}
      <SubmitButton className="mt-4 w-full">Give me my next project</SubmitButton>
    </form>
  );
}

/** Start, or skip with a confirmation that says what skipping costs (nothing but the record). */
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
          Start the project
        </Button>
      ) : null}

      <AlertDialog open={confirmSkip} onOpenChange={setConfirmSkip}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <SkipForward aria-hidden />
            </AlertDialogMedia>
            <AlertDialogTitle>Skip this project?</AlertDialogTitle>
            <AlertDialogDescription>
              It stays on record as skipped. I&apos;ll write a different one when you&apos;re ready.
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
