import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ProviderButtons } from "@/components/auth/provider-buttons";
import { FormAlert } from "@/components/form/form-alert";
import { socialProviders } from "@/lib/auth";
import { oauthErrorMessage } from "@/lib/oauth-errors";
import { safeNext } from "@/lib/safe-next";
import { redirectIfSignedIn } from "@/server/session";

import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <>
      <h1 className="text-display">Sign in</h1>
      <p className="mt-2 mb-7 text-callout text-muted-foreground">
        Your path, missions and evidence are where you left them.
      </p>
      {/* The fallback is the same form, so the request-time part swaps in without a visible change. */}
      <Suspense fallback={<SignInPanel destination="/today" />}>
        <SignInGate searchParams={searchParams} />
      </Suspense>
      <p className="mt-7 text-center text-callout text-muted-foreground">
        New to mentorOS?{" "}
        <Link href="/sign-up" className="font-semibold text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}

async function SignInGate({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  await redirectIfSignedIn();
  const { next, error } = await searchParams;
  return <SignInPanel destination={safeNext(next)} oauthError={oauthErrorMessage(error)} />;
}

function SignInPanel({
  destination,
  oauthError = null,
}: {
  destination: string;
  oauthError?: string | null;
}) {
  return (
    <>
      {oauthError ? <FormAlert className="mb-5">{oauthError}</FormAlert> : null}
      <ProviderButtons providers={socialProviders} next={destination} />
      <SignInForm next={destination} />
    </>
  );
}
