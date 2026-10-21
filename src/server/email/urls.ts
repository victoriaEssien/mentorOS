import "server-only";

import { env } from "@/lib/env";
import { signUnsubscribeToken, type EmailTopic } from "@/lib/unsubscribe-token";

/** An absolute link into the app, for emails (they're read outside it). */
export const appUrl = (path: string) => new URL(path, env.BETTER_AUTH_URL).toString();

/**
 * The two ways out of an email someone can turn off: a page for people (a button, so a mail
 * scanner opening links can't unsubscribe anyone) and the one-click address mail apps call
 * themselves (RFC 8058).
 */
export function unsubscribeLinks(userId: string, topic: EmailTopic) {
  const token = encodeURIComponent(signUnsubscribeToken(userId, topic, env.BETTER_AUTH_SECRET));
  return {
    page: appUrl(`/unsubscribe?token=${token}`),
    oneClick: appUrl(`/api/email/unsubscribe?token=${token}`),
  };
}
