import type { Metadata } from "next";
import Link from "next/link";

import { ProviderButtons } from "@/components/auth/provider-buttons";
import { socialProviders } from "@/lib/auth";

import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-display">Create your account</h1>
      <p className="mt-2 mb-7 text-callout text-muted-foreground">
        Next, a short assessment finds out what you can already do.
      </p>
      <ProviderButtons providers={socialProviders} next="/onboarding" />
      <SignUpForm />
      <p className="mt-7 text-center text-callout text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
