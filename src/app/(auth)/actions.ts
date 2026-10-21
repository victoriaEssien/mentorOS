"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth, socialProviders, type SocialProvider } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

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

  try {
    await auth.api.signUpEmail({ body: parsed.data, headers: await headers() });
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

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (error) {
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
