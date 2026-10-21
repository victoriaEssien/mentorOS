"use server";

import { unsubscribeWithToken } from "@/server/email/preferences";

export type UnsubscribeState = { done: boolean; error?: string };

/** The button on the unsubscribe page. Works signed out: the signed link is the proof. */
export async function unsubscribeAction(token: string): Promise<UnsubscribeState> {
  const topic = await unsubscribeWithToken(token);
  return topic
    ? { done: true }
    : { done: false, error: "This link doesn't work. Change your emails in Settings." };
}
