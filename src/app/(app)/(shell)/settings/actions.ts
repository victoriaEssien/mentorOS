"use server";

import { APIError } from "better-auth/api";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { learnerFields } from "@/lib/learner-fields";
import { EMAIL_TOPICS } from "@/lib/unsubscribe-token";
import { LINK_EMAILS, linkEmailKey, passwordChangedEmail } from "@/server/email/account-emails";
import { setEmailTopic } from "@/server/email/preferences";
import { sendEmail } from "@/server/email/send";
import { appUrl } from "@/server/email/urls";
import { changeSettings, startOver } from "@/server/learning/loop";
import { requireLearner } from "@/server/session";
import { hasRoom, take, type Limit } from "@/server/throttle";

export type SaveState = { error?: string };

// Any subset of what onboarding asked, validated exactly as onboarding validates it.
const settingsSchema = z.strictObject(learnerFields).partial();

export async function saveSettingsAction(changes: unknown): Promise<SaveState> {
  const { user } = await requireLearner();
  const parsed = settingsSchema.safeParse(changes);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That change couldn't be saved. Try again." };
  }

  await changeSettings(user.id, parsed.data);
  refresh();
  return {};
}

const nameSchema = z
  .string()
  .trim()
  .min(1, { error: "Your name can't be empty." })
  .max(80, { error: "Keep your name under 80 characters." });

export async function saveNameAction(name: unknown): Promise<SaveState> {
  await requireLearner();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "That name couldn't be saved." };

  await auth.api.updateUser({ body: { name: parsed.data }, headers: await headers() });
  refresh();
  return {};
}

const topicSchema = z.enum(EMAIL_TOPICS);

/** The two optional emails' switches. */
export async function saveEmailTopicAction(topic: unknown, on: unknown): Promise<SaveState> {
  const { user } = await requireLearner();
  const parsed = z.object({ topic: topicSchema, on: z.boolean() }).safeParse({ topic, on });
  if (!parsed.success) return { error: "That change couldn't be saved. Try again." };
  await setEmailTopic(user.id, parsed.data.topic, parsed.data.on);
  refresh();
  return {};
}

/** Sends the confirmation link again, for an address that isn't confirmed yet. */
export async function sendConfirmationAction(): Promise<SaveState> {
  const { user } = await requireLearner();
  if (user.emailVerified) return {};
  // The send itself is capped quietly (it can come from sign-up too); this says so out loud.
  if (!(await hasRoom(linkEmailKey("confirm", user.id), LINK_EMAILS))) {
    return { error: "You've asked for a few links already. Use the newest one, or try again in an hour." };
  }
  try {
    await auth.api.sendVerificationEmail({
      body: { email: user.email, callbackURL: "/today?email=confirmed" },
      headers: await headers(),
    });
  } catch {
    return { error: "That didn't send. Wait a minute and try again." };
  }
  return {};
}

const passwordChange = z.object({
  current: z.string().min(1, { error: "Enter your current password." }),
  next: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .max(128, { error: "Use 128 characters or fewer." }),
});

/** Tries at the current password per account, so a borrowed session can't guess its way in. */
const PASSWORD_TRIES: Limit = { max: 5, perSeconds: 15 * 60 };

/**
 * Changes the password and signs out every other device; then emails the owner, so a change they
 * didn't make can't go unnoticed.
 */
export async function changePasswordAction(current: unknown, next: unknown): Promise<SaveState> {
  const { user } = await requireLearner();
  const parsed = passwordChange.safeParse({ current, next });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check both passwords." };
  if (!(await take(`password-change:${user.id}`, PASSWORD_TRIES))) {
    return { error: "Too many tries. Wait 15 minutes, then try again." };
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.current,
        newPassword: parsed.data.next,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_PASSWORD") {
      return { error: "That isn't your current password." };
    }
    return { error: "That change didn't save. Try again in a moment." };
  }

  after(() => sendEmail(passwordChangedEmail(user, appUrl("/forgot-password"))));
  return {};
}

/** Clears their learning and sends them back through onboarding, answers kept. */
export async function startOverAction(): Promise<void> {
  const { user } = await requireLearner();
  await startOver(user.id);
  redirect("/onboarding");
}
