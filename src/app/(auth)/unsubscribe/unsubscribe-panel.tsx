"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormAlert } from "@/components/form/form-alert";
import { FormNotice } from "@/components/form/form-notice";
import { SubmitButton } from "@/components/form/submit-button";

import { unsubscribeAction, type UnsubscribeState } from "./actions";

export function UnsubscribePanel({ token, what }: { token: string; what: string }) {
  const [state, action, pending] = useActionState<UnsubscribeState>(() => unsubscribeAction(token), {
    done: false,
  });

  if (state.done) {
    return (
      <>
        <FormNotice>Done. You won&apos;t get {what} any more.</FormNotice>
        <p className="mt-5 text-callout text-muted-foreground">
          Changed your mind? Turn them back on in{" "}
          <Link href="/settings" className="font-semibold text-foreground underline underline-offset-4">
            Settings
          </Link>
          .
        </p>
      </>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <SubmitButton size="lg" pending={pending} pendingLabel="Stopping" className="w-full">
        Stop {what}
      </SubmitButton>
    </form>
  );
}
