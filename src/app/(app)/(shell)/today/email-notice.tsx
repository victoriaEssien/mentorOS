"use client";

import { Mail, MailX } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { FormNotice } from "@/components/form/form-notice";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { sendConfirmationAction } from "../settings/actions";

export type EmailNoticeState = "confirmed" | "unconfirmed" | "link-failed";

/**
 * Today's line about the learner's address: a quiet reminder while it waits to be confirmed (it
 * blocks nothing), a short "confirmed" once the link is used, and a way to get a fresh link when
 * the old one had expired.
 */
export function EmailNotice({ state, email }: { state: EmailNoticeState; email: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // The link's result arrives in the URL; drop it, so a reload doesn't say it again.
  useEffect(() => {
    if (state !== "unconfirmed") window.history.replaceState(null, "", window.location.pathname);
  }, [state]);

  if (state === "confirmed") return <FormNotice className="mb-5">Your email is confirmed.</FormNotice>;

  const failed = state === "link-failed";
  const Icon = failed ? MailX : Mail;
  const resend = () =>
    startTransition(async () => {
      const result = await sendConfirmationAction();
      setError(result.error);
      setSent(!result.error);
    });

  return (
    <div
      role="status"
      className={cn(
        "mb-5 flex items-center gap-3 rounded-md border px-3.5 py-2.5",
        failed ? "border-fail/30 bg-fail/10" : "border-rule bg-window",
      )}
    >
      <Icon className={cn("size-4.5 shrink-0", failed ? "text-fail" : "text-muted-foreground")} aria-hidden />
      <p className="min-w-0 flex-1 text-footnote wrap-anywhere text-muted-foreground">
        {sent
          ? `A new link is on its way to ${email}.`
          : (error ??
            (failed
              ? "That link had expired or didn't work."
              : `Confirm your email. The link went to ${email}.`))}
      </p>
      {sent ? null : (
        <Button variant="ghost" size="sm" className="-mr-1.5 shrink-0" disabled={pending} onClick={resend}>
          {pending ? "Sending" : failed ? "Send a new link" : "Send again"}
        </Button>
      )}
    </div>
  );
}
