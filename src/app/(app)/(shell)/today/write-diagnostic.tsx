"use client";

import { useActionState } from "react";

import { FormAlert } from "@/components/form/form-alert";
import { SubmitButton } from "@/components/form/submit-button";
import { CellMeter } from "@/components/system/cell-meter";

import { writeDiagnosticAction } from "./actions";

/**
 * When onboarding couldn't write the diagnostic (the model was down), Today offers to write it
 * now. It takes about a minute, so the panel says so while it works, then opens it.
 */
export function WriteDiagnosticPanel() {
  const [state, formAction, pending] = useActionState(writeDiagnosticAction, {});

  if (pending) {
    return (
      <div role="status" className="rounded-lg border border-rule bg-window p-5 shadow-window">
        <CellMeter
          value={1}
          label="Writing your diagnostic"
          animate
          className="[&>span]:h-3 [&>span]:[animation-direction:alternate] [&>span]:[animation-iteration-count:infinite]"
        />
        <p className="mt-5 text-headline">Writing your diagnostic</p>
        <p className="mt-1 text-callout text-muted-foreground">
          Real questions across your tracks, pitched to find your level. This takes about a minute.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-lg border border-rule bg-window p-5 shadow-window">
      <p className="text-headline">Your diagnostic isn&apos;t written yet</p>
      <p className="mt-1 text-callout text-muted-foreground">
        It couldn&apos;t be written when you signed up. Everything else starts from it: your path, your
        missions, every estimate.
      </p>
      {state.error ? <FormAlert className="mt-4">{state.error}</FormAlert> : null}
      <SubmitButton className="mt-4 w-full">Write my diagnostic</SubmitButton>
    </form>
  );
}
