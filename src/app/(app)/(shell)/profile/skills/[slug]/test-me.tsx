"use client";

import { useActionState } from "react";

import { FormAlert } from "@/components/form/form-alert";
import { SubmitButton } from "@/components/form/submit-button";
import { CellMeter } from "@/components/system/cell-meter";

import { testSkillAction } from "./actions";

/** "Test me": a short check on this skill, written on the spot. */
export function TestMe({ slug, name, reassess }: { slug: string; name: string; reassess: boolean }) {
  const [state, formAction, pending] = useActionState(testSkillAction.bind(null, slug), {});

  if (pending) {
    return (
      <div role="status" className="rounded-lg border border-rule bg-window p-5 shadow-window">
        <CellMeter
          value={1}
          label="Writing your check"
          animate
          className="[&>span]:h-3 [&>span]:[animation-direction:alternate] [&>span]:[animation-iteration-count:infinite]"
        />
        <p className="mt-5 text-headline">Writing your check</p>
        <p className="mt-1 text-callout text-muted-foreground">
          A few questions on {name}. About half a minute.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-callout text-muted-foreground">
        {reassess
          ? `This estimate rests on little evidence. A few questions from new angles will firm it up.`
          : `Think you know ${name}? A few questions will show it, and each answer is evidence.`}
      </p>
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <SubmitButton variant="secondary" className="w-full">
        Test me on {name}
      </SubmitButton>
    </form>
  );
}
