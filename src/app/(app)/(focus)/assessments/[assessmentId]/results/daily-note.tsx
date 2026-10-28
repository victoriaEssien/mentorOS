"use client";

import { useActionState } from "react";

import { Field } from "@/components/form/field";
import { FormAlert } from "@/components/form/form-alert";
import { FormNotice } from "@/components/form/form-notice";
import { SubmitButton } from "@/components/form/submit-button";
import { Textarea } from "@/components/ui/textarea";

import { saveDailyNoteAction } from "../actions";

/**
 * After a daily set: what they learned and what they got wrong, in their own words. It never
 * changes a score; it's what the week's post is written from.
 */
export function DailyNoteForm({
  assessmentId,
  note,
}: {
  assessmentId: string;
  note: { learned: string; gotWrong: string } | null;
}) {
  const [state, formAction] = useActionState(saveDailyNoteAction.bind(null, assessmentId), {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="-mt-1 text-footnote text-muted-foreground">
        Two lines for your record. They never change a score; your weekly post is written from them.
      </p>
      <Field id="learned" label="What did you learn?">
        <Textarea
          id="learned"
          name="learned"
          required
          minLength={10}
          maxLength={2000}
          defaultValue={note?.learned}
          className="min-h-20"
        />
      </Field>
      <Field id="gotWrong" label="What did you get wrong, or nearly?">
        <Textarea
          id="gotWrong"
          name="gotWrong"
          required
          minLength={10}
          maxLength={2000}
          defaultValue={note?.gotWrong}
          className="min-h-20"
        />
      </Field>
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      {state.saved ? <FormNotice>Saved. It goes into this week&apos;s post.</FormNotice> : null}
      <SubmitButton variant="secondary">{note ? "Update the note" : "Save the note"}</SubmitButton>
    </form>
  );
}
