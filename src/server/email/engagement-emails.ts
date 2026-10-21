import "server-only";

import type { Outcome } from "@/server/learning/difficulty";

import { renderEmail, type Block } from "./layout";
import type { OutgoingEmail } from "./send";
import { appUrl, unsubscribeLinks } from "./urls";

/**
 * The emails someone can turn off: weekly progress on Mondays, and a reminder when they've been
 * away. Both are built from their record in plain code (no model calls), carry a one-click
 * unsubscribe, and point at one thing to do.
 */

type Recipient = { userId: string; name: string | null; email: string };

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || "there";

const OUTCOME_WORDS: Record<Outcome, string> = {
  strong: "strong",
  pass: "passed",
  partial: "partly there",
  fail: "not yet",
};

export type WeeklyDigest = {
  results: { title: string; label: string; outcome: Outcome }[];
  skills: { name: string; level: string; pieces: number }[];
  /** The path step they're on. */
  focus: string | null;
  /** This week's challenge, if one is in play. */
  challenge: string | null;
};

export function weeklyProgressEmail(to: Recipient, digest: WeeklyDigest, weekKey: string): OutgoingEmail {
  const links = unsubscribeLinks(to.userId, "weekly");
  const count = digest.results.length;
  const skillNames = digest.skills.map((s) => s.name);

  const blocks: Block[] = [
    { kind: "text", text: `Hi ${firstName(to.name)}, here's what your work showed last week.` },
  ];
  if (count > 0) {
    blocks.push({
      kind: "list",
      // A diagnostic's title already says "Diagnostic: …".
      items: digest.results.map((r) => {
        const what = r.title.toLowerCase().startsWith(r.label.toLowerCase())
          ? r.title
          : `${r.label}: ${r.title}`;
        return `${what}, ${OUTCOME_WORDS[r.outcome]}`;
      }),
    });
  }
  if (digest.skills.length > 0) {
    blocks.push({
      kind: "text",
      text: `New evidence on ${digest.skills.map((s) => `${s.name} (now ${s.level.toLowerCase()})`).join(", ")}.`,
    });
  }
  const next = [
    digest.focus ? `Your focus this week: ${digest.focus}.` : null,
    digest.challenge ? `Your weekly challenge: ${digest.challenge}.` : null,
  ].filter((line): line is string => Boolean(line));
  if (next.length > 0) blocks.push({ kind: "text", text: next.join(" ") });

  const { html, text } = renderEmail({
    preheader:
      count > 0
        ? `${count} ${count === 1 ? "result" : "results"}${skillNames.length > 0 ? `, new evidence on ${skillNames.slice(0, 2).join(" and ")}` : ""}. Here's what's next.`
        : `New evidence on ${skillNames.slice(0, 2).join(" and ")}. Here's what's next.`,
    title: "Your week",
    blocks,
    action: { label: "Open mentorOS", url: appUrl("/today") },
    reason: "You're getting this because weekly progress emails are on for your mentorOS account.",
    unsubscribe: { label: "Stop weekly progress emails", url: links.page, settingsUrl: appUrl("/settings") },
  });

  return {
    to: to.email,
    subject: "Your week on mentorOS",
    html,
    text,
    kind: "weekly",
    headers: {
      "List-Unsubscribe": `<${links.oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    idempotencyKey: `weekly/${to.userId}/${weekKey}`,
  };
}

/** What a reminder points at: whatever Today would put first for them. */
export type ReminderPoint = { headline: string; detail: string | null; action: string; path: string };

export function reminderEmail(to: Recipient, point: ReminderPoint, dayKey: string): OutgoingEmail {
  const links = unsubscribeLinks(to.userId, "reminders");
  const { html, text } = renderEmail({
    preheader: point.detail ?? "Pick up where you left off.",
    title: point.headline,
    blocks: [
      { kind: "text", text: `Hi ${firstName(to.name)}, it's been a few days.` },
      ...(point.detail ? [{ kind: "text" as const, text: point.detail }] : []),
    ],
    action: { label: point.action, url: appUrl(point.path) },
    after: [
      {
        kind: "muted",
        text: "Reminders come at most once a week, and stop after two if you're busy. They start again when you're back.",
      },
    ],
    reason: "You're getting this because reminders are on for your mentorOS account.",
    unsubscribe: { label: "Stop reminders", url: links.page, settingsUrl: appUrl("/settings") },
  });

  return {
    to: to.email,
    subject: point.headline,
    html,
    text,
    kind: "reminder",
    headers: {
      "List-Unsubscribe": `<${links.oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    idempotencyKey: `reminder/${to.userId}/${dayKey}`,
  };
}
