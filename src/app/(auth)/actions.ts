"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth, socialProviders, type SocialProvider } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { clientAddress, hasRoom, take, throttleKey, type Limit } from "@/server/throttle";

// Better Auth's own rate limit only covers its HTTP routes, and those are closed (disabledPaths in
// src/lib/auth.ts), so these are the limits that hold.
/** Wrong passwords per network address, and per account so a spread-out attack still stops. */
const SIGN_IN_MISSES_PER_ADDRESS: Limit = { max: 20, perSeconds: 15 * 60 };
const SIGN_IN_MISSES_PER_ACCOUNT: Limit = { max: 10, perSeconds: 15 * 60 };
/** Each new account and each reset request sends an email. */
const SIGN_UPS_PER_ADDRESS: Limit = { max: 5, perSeconds: 60 * 60 };
const RESET_REQUESTS_PER_ADDRESS: Limit = { max: 10, perSeconds: 60 * 60 };

export type AuthField = "name" | "email" | "password";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<AuthField, string>>;
  /** Echoed back so a failed submit keeps what the learner typed (never the password). */
  values?: { name?: string; email?: string };
};

const email = z.email({ error: "Enter a valid email address." }).max(254);

const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Tell us what to call you." })
    .max(80, { error: "Keep it under 80 characters." }),
  email,
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .max(128, { error: "Use 128 characters or fewer." }),
});

const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }),
});

function fieldErrors(error: z.ZodError): AuthFormState["fieldErrors"] {
  const result: AuthFormState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as AuthField;
    result[field] ??= issue.message;
  }
  return result;
}

/** Turns Better Auth's error codes into sentences a learner can act on. */
function describe(error: unknown): string {
  if (!(error instanceof APIError)) throw error;

  switch (error.body?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match an account.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with that email already exists. Sign in instead.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 8 characters.";
    case "PASSWORD_TOO_LONG":
      return "Use 128 characters or fewer.";
    case "INVALID_EMAIL":
      return "Enter a valid email address.";
    default:
      return "Something went wrong on our side. Try again in a moment.";
  }
}

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signUpAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = readForm(formData);
  const values = { name: input.name, email: input.email };

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  if (!(await take(throttleKey("sign-up", await clientAddress()), SIGN_UPS_PER_ADDRESS))) {
    return { error: "Too many new accounts from this network. Try again in an hour.", values };
  }

  try {
    // The confirmation email's link lands on Today, which says the address is confirmed.
    await auth.api.signUpEmail({
      body: { ...parsed.data, callbackURL: "/today?email=confirmed" },
      headers: await headers(),
    });
  } catch (error) {
    return { error: describe(error), values };
  }

  // New learners go straight into onboarding; the diagnostic follows from there.
  redirect("/onboarding");
}

export async function signInAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = readForm(formData);
  const values = { email: input.email };

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  // Only wrong passwords count, so signing in often never locks anyone out.
  const address = throttleKey("sign-in:address", await clientAddress());
  const account = throttleKey("sign-in:account", parsed.data.email);
  const room = await Promise.all([
    hasRoom(address, SIGN_IN_MISSES_PER_ADDRESS),
    hasRoom(account, SIGN_IN_MISSES_PER_ACCOUNT),
  ]);
  if (room.includes(false)) return { error: "Too many tries. Wait 15 minutes, then try again.", values };

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_EMAIL_OR_PASSWORD") {
      await Promise.all([
        take(address, SIGN_IN_MISSES_PER_ADDRESS),
        take(account, SIGN_IN_MISSES_PER_ACCOUNT),
      ]);
    }
    return { error: describe(error), values };
  }

  redirect(safeNext(formData.get("next")));
}

export async function socialSignInAction(formData: FormData) {
  const provider = formData.get("provider");
  if (!socialProviders.includes(provider as SocialProvider)) redirect("/sign-in?error=oauth");

  const result = await auth.api.signInSocial({
    body: {
      provider: provider as SocialProvider,
      callbackURL: safeNext(formData.get("next")),
      newUserCallbackURL: "/onboarding",
      // Better Auth adds its own ?error=<code>, which the sign-in page turns into a message.
      errorCallbackURL: "/sign-in",
    },
    headers: await headers(),
  });

  if (!result.url) redirect("/sign-in?error=oauth");
  redirect(result.url as Parameters<typeof redirect>[0]);
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}

export type ResetRequestState = { sent?: boolean; error?: string; email?: string };

/**
 * "Forgot password?": asks Better Auth to email a reset link. The answer is the same whether or not
 * the address has an account, so the form can't be used to find out who has one.
 */
export async function requestPasswordResetAction(
  _previous: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const address = String(formData.get("email") ?? "").trim();
  const parsed = email.safeParse(address);
  if (!parsed.success) return { error: "Enter the email you signed up with.", email: address };
  // Per network address, so the answer still says nothing about whether the account exists.
  if (!(await take(throttleKey("reset-request", await clientAddress()), RESET_REQUESTS_PER_ADDRESS))) {
    return { error: "Too many reset requests from this network. Try again in an hour.", email: address };
  }

  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data, redirectTo: "/reset-password" },
      headers: await headers(),
    });
  } catch (error) {
    return { error: describe(error), email: address };
  }
  return { sent: true, email: parsed.data };
}

export type ResetPasswordState = { error?: string; fieldError?: string };

const newPassword = z
  .string()
  .min(8, { error: "Use at least 8 characters." })
  .max(128, { error: "Use 128 characters or fewer." });

/** Sets the new password from a reset link, then sends them to sign in with it. */
export async function resetPasswordAction(
  _previous: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = newPassword.safeParse(String(formData.get("password") ?? ""));
  if (!parsed.success) return { fieldError: parsed.error.issues[0]?.message };

  try {
    await auth.api.resetPassword({
      body: { newPassword: parsed.data, token: String(formData.get("token") ?? "") },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_TOKEN") {
      return { error: "This reset link has expired or was already used. Ask for a new one below." };
    }
    return { error: describe(error) };
  }
  redirect("/sign-in?reset=done");
}
