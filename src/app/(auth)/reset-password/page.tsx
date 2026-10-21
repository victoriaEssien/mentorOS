import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FormAlert } from "@/components/form/form-alert";
import { Button } from "@/components/ui/button";

import { ResetPasswordForm } from "../auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

/** Where the reset email's link lands: Better Auth adds ?token=, or ?error= when the link is spent. */
export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <>
      <h1 className="text-display">Choose a new password</h1>
      <p className="mt-2 mb-7 text-callout text-muted-foreground">
        Saving it signs you out of every other device.
      </p>
      <Suspense fallback={null}>
        <ResetGate searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ResetGate({ searchParams }: Pick<PageProps<"/reset-password">, "searchParams">) {
  const { token, error } = await searchParams;
  if (typeof token !== "string" || !token || error) {
    return (
      <>
        <FormAlert className="mb-5">
          This reset link has expired or was already used. Ask for a new one.
        </FormAlert>
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">Send me a new link</Link>
        </Button>
      </>
    );
  }
  return <ResetPasswordForm token={token} />;
}
