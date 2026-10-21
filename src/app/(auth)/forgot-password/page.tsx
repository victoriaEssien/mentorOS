import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "../auth-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-display">Reset your password</h1>
      <p className="mt-2 mb-7 text-callout text-muted-foreground">
        Enter the email you signed up with. You&apos;ll get a link to choose a new password.
      </p>
      <ForgotPasswordForm />
      <p className="mt-7 text-center text-callout text-muted-foreground">
        Remembered it?{" "}
        <Link href="/sign-in" className="font-semibold text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
