import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ProviderButtons } from "@/components/auth/provider-buttons";
import { socialProviders } from "@/lib/auth";
import { redirectIfSignedIn } from "@/server/session";

import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-display">Create your account</h1>
      <p className="mt-2 mb-7 text-callout text-muted-foreground">
        Next, a short assessment finds out what you can already do.
      </p>
      <Suspense fallback={<SignUpPanel />}>
        <SignUpGate />
      </Suspense>
      <p className="mt-5 text-center text-caption text-muted-foreground">
        By creating an account, you agree to the{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          terms of service
        </Link>{" "}
        and the{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          privacy policy
        </Link>
        .
      </p>
      <p className="mt-7 text-center text-callout text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}

async function SignUpGate() {
  await redirectIfSignedIn();
  return <SignUpPanel />;
}

function SignUpPanel() {
  return (
    <>
      <ProviderButtons providers={socialProviders} next="/onboarding" />
      <SignUpForm />
    </>
  );
}
