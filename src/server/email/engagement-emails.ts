import "server-only";

import type { Outcome } from "@/server/learning/difficulty";

import { renderEmail, type Block } from "./layout";
import type { OutgoingEmail } from "./send";
import { appUrl, unsubscribeLinks } from "./urls";

/**
 * The emails someone can turn off: weekly progress on Mondays, and the daily email every other
 * morning (and on Mondays when there's no weekly one). Both are built from their record in plain
 * code, carry a one-click unsubscribe, and point at one thing to do.
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
  /** How the week's daily missions went ("5 of 7 handed in, 2 missed"), if any were given. */
  missions: string | null;
  /** The path step they're on. */
  focus: string | null;
  /** This week's challenge, if one is in play. */
  challenge: string | null;
  /** Last week's post, drafted for LinkedIn and X, if there was anything to post about. */
  post: { linkedin: string; x: string } | null;
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
  if (digest.missions) blocks.push({ kind: "text", text: `Daily missions: ${digest.missions}.` });
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
  if (digest.post) {
    // Each paragraph its own block, so the post keeps its shape in every inbox.
    const paragraphs = (text: string) =>
      text
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);
    blocks.push(
      { kind: "text", text: "Your post for the week, ready to edit and share. For LinkedIn:" },
      ...paragraphs(digest.post.linkedin).map((text) => ({ kind: "muted" as const, text })),
      { kind: "text", text: "For X:" },
      { kind: "muted", text: digest.post.x },
    );
  }

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

/** What today asks of them: whatever Today would put first. */
export type TodayPoint = { headline: string; detail: string | null; action: string; path: string };

/** Everything the daily email says, read from their record. */
export type DailyDigest = {
  point: TodayPoint;
  /** What was handed in over the last day. */
  yesterday: { title: string; label: string; outcome: Outcome }[];
  /** Days since their last hand-in; null if they've never handed anything in. */
  daysSinceHandIn: number | null;
  /** Today's coding set, or null when it isn't offered yet (no path, or code can't run). */
  dailyFive:
    | { state: "not-started" }
    | { state: "in-progress"; answered: number; total: number }
    | { state: "done" }
    | null;
  week: { fivesDone: number; missions: string | null };
};

/**
 * The daily email: what they did yesterday, what today asks, and how the week is going. It comes
 * every day they leave it on, including after time away: that's when it's most useful.
 */
export function dailyEmail(to: Recipient, digest: DailyDigest, dayKey: string): OutgoingEmail {
  const links = unsubscribeLinks(to.userId, "reminders");
  const { point, yesterday, daysSinceHandIn, dailyFive, week } = digest;
  const hi = `Hi ${firstName(to.name)}.`;

  const blocks: Block[] = [];
  if (yesterday.length > 0) {
    blocks.push(
      { kind: "text", text: `${hi} Since yesterday you handed in:` },
      {
        kind: "list",
        items: yesterday.map((r) => {
          const what = r.title.toLowerCase().startsWith(r.label.toLowerCase())
            ? r.title
            : `${r.label}: ${r.title}`;
          return `${what}, ${OUTCOME_WORDS[r.outcome]}`;
        }),
      },
    );
  } else if (daysSinceHandIn !== null && daysSinceHandIn >= 2) {
    blocks.push({
      kind: "text",
      text: `${hi} Your last hand-in was ${daysSinceHandIn} days ago. One small thing today gets you moving again.`,
    });
  } else {
    blocks.push({
      kind: "text",
      text: daysSinceHandIn === null ? hi : `${hi} Nothing was handed in yesterday.`,
    });
  }
  if (point.detail) blocks.push({ kind: "text", text: point.detail });
  if (dailyFive) {
    blocks.push({
      kind: "text",
      text:
        dailyFive.state === "done"
          ? "Today's five: done."
          : dailyFive.state === "in-progress"
            ? `Today's five: ${dailyFive.answered} of ${dailyFive.total} answered.`
            : "Today's five: ready when you are.",
    });
  }
  const weekLine = [
    `${week.fivesDone} daily ${week.fivesDone === 1 ? "five" : "fives"} done`,
    week.missions ? `daily missions ${week.missions}` : null,
  ].filter(Boolean);
  blocks.push({ kind: "text", text: `Last 7 days: ${weekLine.join("; ")}.` });

  const { html, text } = renderEmail({
    preheader:
      point.detail ??
      (yesterday.length > 0 ? `You handed in ${yesterday.length} yesterday.` : "Here's today."),
    title: point.headline,
    blocks,
    action: { label: point.action, url: appUrl(point.path) },
    reason: "You're getting this because the daily email is on for your mentorOS account.",
    unsubscribe: { label: "Stop daily emails", url: links.page, settingsUrl: appUrl("/settings") },
  });

  return {
    to: to.email,
    subject: point.headline,
    html,
    text,
    kind: "daily",
    headers: {
      "List-Unsubscribe": `<${links.oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    idempotencyKey: `daily/${to.userId}/${dayKey}`,
  };
}
