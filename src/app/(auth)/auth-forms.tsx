"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field, fieldAria } from "@/components/form/field";
import { FormAlert } from "@/components/form/form-alert";
import { FormNotice } from "@/components/form/form-notice";
import { SubmitButton } from "@/components/form/submit-button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

import {
  requestPasswordResetAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  type AuthFormState,
  type ResetPasswordState,
  type ResetRequestState,
} from "./actions";

const initialState: AuthFormState = {};

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <Field id="name" label="Name" error={errors.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          defaultValue={state.values?.name}
          {...fieldAria("name", errors.name)}
        />
      </Field>
      <Field id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.values?.email}
          {...fieldAria("email", errors.email)}
        />
      </Field>
      <Field id="password" label="Password" hint="At least 8 characters." error={errors.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          {...fieldAria("password", errors.password, "At least 8 characters.")}
        />
      </Field>
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <SubmitButton size="lg" pending={pending} pendingLabel="Creating your account" className="mt-1 w-full">
        Create account
      </SubmitButton>
    </form>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <Field id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.values?.email}
          {...fieldAria("email", errors.email)}
        />
      </Field>
      <Field id="password" label="Password" error={errors.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          {...fieldAria("password", errors.password)}
        />
      </Field>
      <Link
        href="/forgot-password"
        className="-mt-2 self-end text-footnote text-muted-foreground underline decoration-rule-strong underline-offset-4 hover:text-foreground"
      >
        Forgot password?
      </Link>
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <SubmitButton size="lg" pending={pending} pendingLabel="Signing in" className="mt-1 w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, {} as ResetRequestState);

  if (state.sent) {
    return (
      <FormNotice>
        If there&apos;s an account for {state.email}, a reset link is on its way. It works for an hour. Check
        your spam folder if it doesn&apos;t arrive in a few minutes.
      </FormNotice>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <Field id="email" label="Email" error={state.error}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.email}
          {...fieldAria("email", state.error)}
        />
      </Field>
      <SubmitButton size="lg" pending={pending} pendingLabel="Sending" className="mt-1 w-full">
        Send me a reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, {} as ResetPasswordState);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <Field id="password" label="New password" hint="At least 8 characters." error={state.fieldError}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          {...fieldAria("password", state.fieldError, "At least 8 characters.")}
        />
      </Field>
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <SubmitButton size="lg" pending={pending} pendingLabel="Saving" className="mt-1 w-full">
        Save my new password
      </SubmitButton>
    </form>
  );
}
