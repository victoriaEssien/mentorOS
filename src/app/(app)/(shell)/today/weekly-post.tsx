"use client";

import { ArrowUpRight, Copy } from "lucide-react";
import { useActionState } from "react";
import { toast } from "sonner";

import { Pip } from "@/components/brand/pip";
import { FormAlert } from "@/components/form/form-alert";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";

import { draftPostAction } from "./actions";

type Draft = { linkedin: string; x: string; drewOn: string[] };

/**
 * The week's post (Part E): a LinkedIn post and an X post written from what was handed in this
 * week, ready to copy, edit and post. Drafting takes a model call, so it only happens when asked.
 */
export function WeeklyPostCard({ draft }: { draft: Draft | null }) {
  const [state, formAction, pending] = useActionState(draftPostAction, {});

  if (pending) {
    return (
      <div
        role="status"
        className="flex items-start gap-4 rounded-lg border border-rule bg-window p-5 shadow-window"
      >
        <Pip mood="thinking" size={52} />
        <div className="min-w-0">
          <p className="text-headline">Drafting your post</p>
          <p className="mt-1 text-callout text-muted-foreground">
            From what you handed in this week, and only that. This takes about fifteen seconds.
          </p>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <form action={formAction} className="rounded-lg border border-rule bg-window p-5 shadow-window">
        <div className="flex items-start gap-4">
          <Pip size={52} />
          <div className="min-w-0">
            <p className="text-headline">Post about your week</p>
            <p className="mt-1 text-callout text-muted-foreground">
              A LinkedIn post and an X post from what you built, solved and got wrong this week. Nothing the
              evidence doesn&apos;t show. Edit it, then post it as you.
            </p>
          </div>
        </div>
        {state.error ? <FormAlert className="mt-4">{state.error}</FormAlert> : null}
        <SubmitButton className="mt-4 w-full">Draft my post</SubmitButton>
      </form>
    );
  }

  const xLength = [...draft.x].length;
  return (
    <div className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-window shadow-window">
      <PostBlock
        label="LinkedIn"
        text={draft.linkedin}
        open={{ href: "https://www.linkedin.com/feed/?shareActive=true", label: "Open LinkedIn" }}
      />
      <PostBlock
        label="X"
        meta={`${xLength} of 280`}
        text={draft.x}
        open={{ href: `https://x.com/intent/post?text=${encodeURIComponent(draft.x)}`, label: "Post on X" }}
      />
      <form action={formAction} className="flex flex-col gap-3 p-5">
        {draft.drewOn.length > 0 ? (
          <p className="text-footnote text-muted-foreground">Drawn from: {draft.drewOn.join("; ")}.</p>
        ) : null}
        {state.error ? <FormAlert>{state.error}</FormAlert> : null}
        <SubmitButton variant="secondary">Write another draft</SubmitButton>
      </form>
    </div>
  );
}

function PostBlock({
  label,
  meta,
  text,
  open,
}: {
  label: string;
  meta?: string;
  text: string;
  open: { href: string; label: string };
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} post copied`);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it instead.");
    }
  }

  return (
    <section className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-caption font-semibold text-muted-foreground">
          {label}
          {meta ? <span className="ml-2 font-normal tabular-nums">{meta}</span> : null}
        </h3>
      </div>
      <p className="mt-2 text-callout whitespace-pre-line select-text">{text}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={copy}>
          <Copy aria-hidden />
          Copy
        </Button>
        <Button asChild variant="ghost" size="sm">
          <a href={open.href} target="_blank" rel="noreferrer noopener">
            {open.label}
            <ArrowUpRight aria-hidden />
          </a>
        </Button>
      </div>
    </section>
  );
}
