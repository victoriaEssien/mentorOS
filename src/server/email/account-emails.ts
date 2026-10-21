import "server-only";

import { take, type Limit } from "@/server/throttle";

import { renderEmail } from "./layout";
import { sendEmail, type OutgoingEmail } from "./send";

/**
 * The emails about someone's account. Nobody can switch them off, because each one protects the
 * account or finishes something its owner started. The two that carry a link are capped per hour.
 */

type Recipient = { name: string | null; email: string };

/**
 * Confirm or reset links one account can be sent per kind: room to ask again, not enough to flood
 * an inbox or use up the day's sending. Better Auth's own rate limit skips calls made from server
 * actions, so this is the cap that holds.
 */
export const LINK_EMAILS: Limit = { max: 3, perSeconds: 60 * 60 };

export const linkEmailKey = (kind: "confirm" | "reset", userId: string) => `email:${kind}:${userId}`;

/** Sends a confirm or reset link unless the account has had its share this hour. Never throws. */
export async function sendLinkEmail(
  userId: string,
  email: OutgoingEmail & { kind: "confirm" | "reset" },
): Promise<void> {
  const allowed = await take(linkEmailKey(email.kind, userId), LINK_EMAILS).catch((error: unknown) => {
    console.error(JSON.stringify({ event: "throttle.failed", reason: String(error) }));
    return true;
  });
  if (!allowed) {
    console.warn(JSON.stringify({ event: "email.throttled", kind: email.kind }));
    return;
  }
  await sendEmail(email);
}

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || "there";

/** Sent on email sign-up (and again on request). The url is Better Auth's verification link. */
export function confirmEmail(to: Recipient, url: string): OutgoingEmail & { kind: "confirm" } {
  const { html, text } = renderEmail({
    preheader: "One tap, so your account stays yours.",
    title: "Confirm your email",
    blocks: [
      { kind: "text", text: `Hi ${firstName(to.name)}, tap the button to confirm this is your address.` },
      {
        kind: "text",
        text: "Once it's confirmed, you can always get back in with a password reset, and you can add Google sign-in to this account.",
      },
    ],
    action: { label: "Confirm my email", url },
    after: [
      {
        kind: "muted",
        text: "The link works for 24 hours. If you didn't create a mentorOS account, you can ignore this email.",
      },
    ],
    reason: "You're getting this because this address was used to create a mentorOS account.",
  });
  return { to: to.email, subject: "Confirm your email for mentorOS", html, text, kind: "confirm" };
}

/** Sent from "Forgot password?". The url is Better Auth's one-time reset link. */
export function resetPasswordEmail(to: Recipient, url: string): OutgoingEmail & { kind: "reset" } {
  const { html, text } = renderEmail({
    preheader: "Choose a new password. The link works for an hour.",
    title: "Reset your password",
    blocks: [{ kind: "text", text: `Hi ${firstName(to.name)}, tap the button to choose a new password.` }],
    action: { label: "Choose a new password", url },
    after: [
      {
        kind: "muted",
        text: "The link works once, for an hour. If you didn't ask for this, ignore this email and your password stays as it is.",
      },
    ],
    reason: "You're getting this because someone asked to reset the password for this mentorOS account.",
  });
  return { to: to.email, subject: "Reset your mentorOS password", html, text, kind: "reset" };
}

/** Sent after a reset or a change in Settings, so a takeover can't go unnoticed. */
export function passwordChangedEmail(to: Recipient, forgotPasswordUrl: string): OutgoingEmail {
  const { html, text } = renderEmail({
    preheader: "If that was you, there's nothing to do.",
    title: "Your password was changed",
    blocks: [
      {
        kind: "text",
        text: `Hi ${firstName(to.name)}, the password for your mentorOS account was just changed. If that was you, there's nothing to do.`,
      },
      { kind: "text", text: "If it wasn't, reset it now. Resetting signs out every other device." },
    ],
    action: { label: "Reset my password", url: forgotPasswordUrl },
    reason:
      "You're getting this because the password on this account changed. Account emails like this one always go out.",
  });
  return {
    to: to.email,
    subject: "Your mentorOS password was changed",
    html,
    text,
    kind: "password-changed",
  };
}
