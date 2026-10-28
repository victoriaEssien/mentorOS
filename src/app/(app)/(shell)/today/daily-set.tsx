"use client";

import { useActionState } from "react";

import { Pip } from "@/components/brand/pip";
import { FormAlert } from "@/components/form/form-alert";
import { SubmitButton } from "@/components/form/submit-button";

import { getDailySetAction } from "./actions";

/**
 * "Get today's five": writing the set takes a minute or two, because every question is run
 * against a working solution before it's kept, so the panel says so while it works.
 */
export function GetDailySetPanel() {
  const [state, formAction, pending] = useActionState(getDailySetAction, {});

  if (pending) {
    return (
      <div
        role="status"
        className="flex items-start gap-4 rounded-lg border border-rule bg-window p-5 shadow-window"
      >
        <Pip mood="thinking" size={52} />
        <div className="min-w-0">
          <p className="text-headline">Writing today&apos;s five</p>
          <p className="mt-1 text-callout text-muted-foreground">
            Each question is run against a working solution before you see it, so every test is right. This
            takes a minute or two.
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
          <p className="text-headline">Today&apos;s five</p>
          <p className="mt-1 text-callout text-muted-foreground">
            A program to write, an interview problem, a bug to fix, code to explain and an output to predict,
            in Go, Rust, C++ and Java.
          </p>
        </div>
      </div>
      {state.error ? <FormAlert className="mt-4">{state.error}</FormAlert> : null}
      <SubmitButton className="mt-4 w-full">Get today&apos;s five</SubmitButton>
    </form>
  );
}
