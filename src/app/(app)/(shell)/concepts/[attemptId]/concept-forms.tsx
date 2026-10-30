"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { Pip } from "@/components/brand/pip";
import { FormAlert } from "@/components/form/form-alert";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { answerFollowUpAction, explainConceptAction, prepareConceptAction } from "./actions";

/**
 * Shown while a concept isn't ready: writes it (the first time anyone opens it) and the question as
 * soon as the page opens; the action refreshes the page's data to show them.
 */
export function PrepareConcept({ attemptId, review }: { attemptId: string; review: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const asked = useRef(false);

  function prepare() {
    setError(null);
    startTransition(async () => {
      const result = await prepareConceptAction(attemptId).catch(() => ({
        error: "That didn't finish. Check your connection and try again.",
      }));
      if (result.error) setError(result.error);
    });
  }

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    prepare();
    // Once per mount: the concept is written once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      className="flex items-start gap-4 rounded-lg border border-rule bg-window p-5 shadow-window"
    >
      <Pip mood={error ? "notYet" : "thinking"} size={52} />
      <div className="min-w-0 flex-1">
        {error ? (
          <>
            <FormAlert>{error}</FormAlert>
            <Button variant="secondary" className="mt-3" onClick={prepare}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <p className="text-headline">
              {review ? "Writing a fresh question" : "Getting this concept ready"}
            </p>
            <p className="mt-1 text-callout text-muted-foreground">
              {review
                ? "A new way to ask about it, so you reason it through rather than recite. A few seconds."
                : "Its checklist and reference explanation are written once, the first time it's opened. About fifteen seconds."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The explanation, written after their own research. The draft stays on this device until it's
 * sent, so research tabs and a closed app never lose it.
 */
export function ExplainForm({ attemptId }: { attemptId: string }) {
  const storageKey = `mentoros:explain:${attemptId}`;
  const [draft, setDraft] = useState("");
  const [state, formAction, pending] = useActionState(explainConceptAction.bind(null, attemptId), {});

  // Restore once after mount; storage can be missing or blocked, which just means no draft.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after hydration
      if (saved) setDraft(saved);
    } catch {}
  }, [storageKey]);

  function update(value: string) {
    setDraft(value);
    try {
      window.localStorage.setItem(storageKey, value);
    } catch {}
  }

  if (pending) {
    return (
      <div
        role="status"
        className="flex items-start gap-4 rounded-lg border border-rule bg-window p-5 shadow-window"
      >
        <Pip mood="thinking" size={52} />
        <div className="min-w-0">
          <p className="text-headline">Grading your explanation</p>
          <p className="mt-1 text-callout text-muted-foreground">
            Point by point against the checklist. About fifteen seconds.
          </p>
        </div>
      </div>
    );
  }

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Textarea
        name="explanation"
        aria-label="Your explanation"
        placeholder="How it works and why, in your own words. A small example helps."
        value={draft}
        onChange={(event) => update(event.target.value)}
        required
        minLength={150}
        maxLength={6000}
        className="min-h-64"
      />
      <p className="text-footnote text-muted-foreground tabular-nums">{words} words</p>
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <SubmitButton size="lg" className="w-full">
        Send my explanation
      </SubmitButton>
    </form>
  );
}

/** Clears the saved draft once the explanation has been graded. */
export function ClearExplainDraft({ attemptId }: { attemptId: string }) {
  useEffect(() => {
    try {
      window.localStorage.removeItem(`mentoros:explain:${attemptId}`);
    } catch {}
  }, [attemptId]);
  return null;
}

/** The answer to the follow-up question, checked briefly. */
export function FollowUpForm({ attemptId }: { attemptId: string }) {
  const [state, formAction, pending] = useActionState(answerFollowUpAction.bind(null, attemptId), {});
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Textarea
        name="answer"
        aria-label="Your answer"
        required
        minLength={20}
        maxLength={3000}
        className="min-h-28"
        disabled={pending}
      />
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <SubmitButton variant="secondary">{pending ? "Checking" : "Check my answer"}</SubmitButton>
    </form>
  );
}
