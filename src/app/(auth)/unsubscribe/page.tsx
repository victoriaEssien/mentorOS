import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FormAlert } from "@/components/form/form-alert";
import type { EmailTopic } from "@/lib/unsubscribe-token";
import { unsubscribeTopic } from "@/server/email/preferences";

import { UnsubscribePanel } from "./unsubscribe-panel";

export const metadata: Metadata = { title: "Unsubscribe" };

const WHAT: Record<EmailTopic, string> = { weekly: "weekly progress emails", reminders: "daily emails" };

/** Where an email's "Stop these emails" link lands. Signed in or not, one button and it's done. */
export default function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  return (
    <Suspense fallback={null}>
      <UnsubscribeGate searchParams={searchParams} />
    </Suspense>
  );
}

async function UnsubscribeGate({ searchParams }: Pick<PageProps<"/unsubscribe">, "searchParams">) {
  const { token } = await searchParams;
  const topic = typeof token === "string" ? unsubscribeTopic(token) : null;

  if (!topic || typeof token !== "string") {
    return (
      <>
        <h1 className="text-display">Unsubscribe</h1>
        <FormAlert className="mt-6">
          This link doesn&apos;t work. You can change which emails you get in{" "}
          <Link href="/settings" className="font-semibold underline underline-offset-4">
            Settings
          </Link>
          .
        </FormAlert>
      </>
    );
  }

  return (
    <>
      <h1 className="text-display">Stop {WHAT[topic]}?</h1>
      <p className="mt-2 mb-7 text-callout text-muted-foreground">
        You&apos;ll still get emails about your account, like a password reset you asked for.
      </p>
      <UnsubscribePanel token={token} what={WHAT[topic]} />
    </>
  );
}
