import type { Metadata } from "next";
import Link from "next/link";

import { ProviderButtons } from "@/components/auth/provider-buttons";
import { FormAlert } from "@/components/form/form-alert";
import { socialProviders } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, error } = await searchParams;
  const destination = safeNext(next);

  return (
    <>
      <h1 className="text-display">Sign in</h1>
      <p className="mt-2 mb-7 text-callout text-muted-foreground">
        Your path, missions and evidence are where you left them.
      </p>
      {error === "oauth" ? (
        <FormAlert className="mb-5">That sign-in didn&apos;t finish. Try again, or use your email.</FormAlert>
      ) : null}
      <ProviderButtons providers={socialProviders} next={destination} />
      <SignInForm next={destination} />
      <p className="mt-7 text-center text-callout text-muted-foreground">
        New to mentorOS?{" "}
        <Link href="/sign-up" className="font-semibold text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
