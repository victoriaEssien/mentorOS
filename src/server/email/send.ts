import "server-only";

import { env } from "@/lib/env";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Short name for logs: "confirm", "reset", "weekly". */
  kind: string;
  /** Extra headers, such as List-Unsubscribe on the emails people can turn off. */
  headers?: Record<string, string>;
  /** Resend drops a repeat with the same key, so a retried job can't send twice. */
  idempotencyKey?: string;
};

export type SendResult = "sent" | "logged" | "failed";

/**
 * Sends one email through Resend's API. Outside production nothing reaches a learner's inbox: test
 * accounts use made-up addresses, and every bounce costs the sending domain reputation. There,
 * EMAIL_DEV_REDIRECT delivers everything to one address instead (delivered@resend.dev is Resend's
 * test inbox), and without it the email is printed to the server log, links included.
 *
 * Never throws for a delivery problem: a sign-up or a password reset shouldn't fail because an
 * email couldn't go. It logs, and says what happened: sent, only logged (development), or failed.
 */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  const production = env.NODE_ENV === "production";
  const to = production ? email.to : env.EMAIL_DEV_REDIRECT;

  if (!to || !env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (production) {
      console.error(JSON.stringify({ event: "email.not_configured", kind: email.kind }));
      return "failed";
    }
    console.info(`\n--- email (${email.kind}) for ${email.to}: ${email.subject}\n${email.text}\n---\n`);
    return "logged";
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [to],
        // Redirected test mail says who it was really for.
        subject: production ? email.subject : `[for ${email.to}] ${email.subject}`,
        html: email.html,
        text: email.text,
        ...(email.headers ? { headers: email.headers } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error(
        JSON.stringify({ event: "email.failed", kind: email.kind, status: response.status, detail }),
      );
      return "failed";
    }
    const { id } = (await response.json()) as { id?: string };
    console.info(JSON.stringify({ event: "email.sent", kind: email.kind, id }));
    return "sent";
  } catch (error) {
    console.error(JSON.stringify({ event: "email.failed", kind: email.kind, reason: String(error) }));
    return "failed";
  }
}
