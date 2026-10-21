"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { Field, fieldAria } from "@/components/form/field";
import { FormAlert } from "@/components/form/form-alert";
import { SubmitButton } from "@/components/form/submit-button";
import { CellMeter } from "@/components/system/cell-meter";
import { RichText } from "@/components/system/rich-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { handInAction, type HandInState } from "./actions";

type Draft = {
  links: string[];
  content: string;
  reflection: Record<"difficult" | "understoodBetter" | "wouldChange" | "stillConfused", string>;
};

const emptyDraft: Draft = {
  links: [""],
  content: "",
  reflection: { difficult: "", understoodBetter: "", wouldChange: "", stillConfused: "" },
};

/** Short questions after the work (PRD §20). Weekly challenges get all four. */
const REFLECTION = [
  { key: "difficult", label: "What was difficult?", weeklyOnly: false },
  { key: "understoodBetter", label: "What do you understand better now?", weeklyOnly: true },
  { key: "wouldChange", label: "What would you do differently?", weeklyOnly: true },
  { key: "stillConfused", label: "What are you still unsure about?", weeklyOnly: false },
] as const;

/**
 * Handing in work. Everything typed is kept as a draft on this device until it's handed in, so
 * closing the tab or a failed evaluation never loses a long explanation.
 */
export function HandInForm({
  missionId,
  deliverable,
  weekly,
}: {
  missionId: string;
  deliverable: string;
  weekly: boolean;
}) {
  const storageKey = `mentoros:hand-in:${missionId}`;
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [state, formAction, pending] = useActionState<HandInState, FormData>(
    handInAction.bind(null, missionId),
    {},
  );

  // Restore once after mount; storage can be missing or blocked, which just means no draft.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after hydration
      if (saved) setDraft({ ...emptyDraft, ...(JSON.parse(saved) as Draft) });
    } catch {}
  }, [storageKey]);

  function update(next: Draft) {
    setDraft(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }

  if (pending) {
    return (
      <div role="status" className="rounded-lg border border-rule bg-window p-5 shadow-window">
        <CellMeter
          value={1}
          label="Reading your work"
          animate
          className="[&>span]:h-3 [&>span]:[animation-direction:alternate] [&>span]:[animation-iteration-count:infinite]"
        />
        <p className="mt-5 text-headline">Reading your work</p>
        <p className="mt-1 text-callout text-muted-foreground">
          Opening your links, scoring the work against each criterion, then checking that feedback before you
          see it. This takes about a minute; keep this screen open.
        </p>
      </div>
    );
  }

  const linkError = state.fieldErrors?.links;
  const contentError = state.fieldErrors?.content;

  return (
    <form action={formAction} className="flex flex-col gap-7">
      <div className="rounded-lg border border-rule bg-raised px-4 py-3.5">
        <p className="text-footnote font-semibold">What to hand in</p>
        <p className="mt-1 text-callout">
          <RichText text={deliverable} />
        </p>
      </div>

      <Field
        id="link-0"
        label="Links"
        error={linkError}
        hint="Public GitHub repositories and gists are read in full. I can't open other links, so paste anything that matters below."
      >
        <div className="flex flex-col gap-2">
          {draft.links.map((link, index) => (
            <div key={index} className="flex gap-2">
              <Input
                id={`link-${index}`}
                name="link"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://github.com/you/project"
                value={link}
                onChange={(event) => {
                  const links = [...draft.links];
                  links[index] = event.target.value;
                  update({ ...draft, links });
                }}
                {...(index === 0 ? fieldAria("link-0", linkError, "hint") : {})}
              />
              {draft.links.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove this link"
                  onClick={() => update({ ...draft, links: draft.links.filter((_, i) => i !== index) })}
                >
                  <X />
                </Button>
              ) : null}
            </div>
          ))}
          {draft.links.length < 3 ? (
            <Button
              type="button"
              variant="link"
              className="self-start"
              onClick={() => update({ ...draft, links: [...draft.links, ""] })}
            >
              <Plus aria-hidden />
              Add another link
            </Button>
          ) : null}
        </div>
      </Field>

      <Field
        id="content"
        label="Your explanation"
        error={contentError}
        hint="Paste code, queries or output here too, then explain your reasoning: why it works and what you tried."
      >
        <Textarea
          id="content"
          name="content"
          required
          minLength={20}
          maxLength={20_000}
          className="min-h-48"
          value={draft.content}
          onChange={(event) => update({ ...draft, content: event.target.value })}
          {...fieldAria("content", contentError, "hint")}
        />
      </Field>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1">
          <span className="text-headline">Reflection</span>
          <span className="ml-2 text-footnote text-muted-foreground">Optional</span>
        </legend>
        <p className="-mt-2 text-footnote text-muted-foreground">
          It never changes your scores. It tells me what the scores can&apos;t: what felt shaky.
        </p>
        {REFLECTION.filter((question) => weekly || !question.weeklyOnly).map((question) => (
          <Field key={question.key} id={question.key} label={question.label}>
            <Textarea
              id={question.key}
              name={question.key}
              maxLength={2000}
              className="min-h-20"
              value={draft.reflection[question.key]}
              onChange={(event) =>
                update({ ...draft, reflection: { ...draft.reflection, [question.key]: event.target.value } })
              }
            />
          </Field>
        ))}
      </fieldset>

      {state.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton size="lg" className="w-full">
        Hand in for evaluation
      </SubmitButton>
    </form>
  );
}

/** Clears the draft once the evaluation page is reached. */
export function ClearDraft({ missionId }: { missionId: string }) {
  useEffect(() => {
    try {
      window.localStorage.removeItem(`mentoros:hand-in:${missionId}`);
    } catch {}
  }, [missionId]);
  return null;
}
