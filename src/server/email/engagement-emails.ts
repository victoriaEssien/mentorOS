import "server-only";

import { renderEmail, type Block } from "./layout";
import type { OutgoingEmail } from "./send";
import { appUrl, unsubscribeLinks } from "./urls";

/**
 * The emails someone can turn off: weekly progress on Mondays, and the daily email every other
 * morning (and on Mondays when there's no weekly one). Both are built from their record in plain
 * code, carry a one-click unsubscribe, and point at one thing to do.
 */

type Recipient = { userId: string; name: string | null; email: string };

type Verdict = "solid" | "partly" | "not_yet";

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || "there";

const VERDICT_WORDS: Record<Verdict, string> = { solid: "solid", partly: "partly there", not_yet: "not yet" };

export type WeeklyDigest = {
  /** Concepts explained over the week, with how each went. */
  concepts: { title: string; verdict: Verdict }[];
  /** The theme's project, if there is one: its title and where it stands. */
  project: { title: string; status: string } | null;
  /** The theme they're on now. */
  theme: string | null;
};

export function weeklyProgressEmail(to: Recipient, digest: WeeklyDigest, weekKey: string): OutgoingEmail {
  const links = unsubscribeLinks(to.userId, "weekly");
  const count = digest.concepts.length;

  const blocks: Block[] = [{ kind: "text", text: `Hi ${firstName(to.name)}, here's your last week.` }];
  if (count > 0) {
    blocks.push(
      { kind: "text", text: `You explained ${count} ${count === 1 ? "concept" : "concepts"}:` },
      { kind: "list", items: digest.concepts.map((c) => `${c.title}, ${VERDICT_WORDS[c.verdict]}`) },
    );
    const shaky = digest.concepts.filter((c) => c.verdict !== "solid").length;
    if (shaky > 0) {
      blocks.push({ kind: "text", text: `${shaky} of them come back soon, asked a new way, until they stick.` });
    }
  } else {
    blocks.push({ kind: "text", text: "No concepts explained last week. Today's is waiting." });
  }
  if (digest.project) blocks.push({ kind: "text", text: `Project: ${digest.project.title}, ${digest.project.status}.` });
  if (digest.theme) blocks.push({ kind: "text", text: `This week's theme: ${digest.theme}.` });

  const { html, text } = renderEmail({
    preheader:
      count > 0 ? `${count} ${count === 1 ? "concept" : "concepts"} explained. Here's what's next.` : "Here's what's next.",
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

/** Everything the daily email says, read from their record. */
export type DailyDigest = {
  theme: string;
  /** Today's new concept, if the theme has one left. */
  newConcept: string | null;
  /** Reviews due today, at most the day's cap. */
  reviewsDue: number;
  /** How yesterday's explanations went. */
  yesterday: { title: string; verdict: Verdict }[];
  /** Days since they last explained anything; null if they never have. */
  daysAway: number | null;
  /** The theme's project and the days left on it, if it's open. */
  project: { title: string; daysLeft: number } | null;
};

/**
 * The daily email: today's concept and reviews, how yesterday went, and the project. It comes every
 * day they leave it on, including after time away: that's when it's most useful.
 */
export function dailyEmail(to: Recipient, digest: DailyDigest, dayKey: string): OutgoingEmail {
  const links = unsubscribeLinks(to.userId, "reminders");
  const { newConcept, reviewsDue, yesterday, daysAway, project } = digest;
  const hi = `Hi ${firstName(to.name)}.`;
  const reviews = reviewsDue > 0 ? `${reviewsDue} ${reviewsDue === 1 ? "review" : "reviews"}` : null;

  const blocks: Block[] = [];
  if (yesterday.length > 0) {
    blocks.push(
      { kind: "text", text: `${hi} Yesterday you explained:` },
      { kind: "list", items: yesterday.map((c) => `${c.title}, ${VERDICT_WORDS[c.verdict]}`) },
    );
  } else if (daysAway !== null && daysAway >= 2) {
    blocks.push({ kind: "text", text: `${hi} It's been ${daysAway} days. One concept today gets you moving again.` });
  } else {
    blocks.push({ kind: "text", text: hi });
  }
  blocks.push({
    kind: "text",
    text: `Today, from ${digest.theme}: ${[newConcept ? `${newConcept} (new)` : null, reviews].filter(Boolean).join(" and ") || "nothing new or due. Spend the time on your project"}.`,
  });
  if (project) {
    blocks.push({
      kind: "text",
      text: `Project: ${project.title}, ${project.daysLeft === 1 ? "last day" : `${project.daysLeft} days left`}.`,
    });
  }

  const headline = newConcept ? `Today's concept: ${newConcept}` : reviews ? `${reviews} due today` : "Today on mentorOS";
  const { html, text } = renderEmail({
    preheader: reviews && newConcept ? `Plus ${reviews}.` : (project ? `${project.title}.` : "Here's today."),
    title: headline,
    blocks,
    action: { label: "Open today's session", url: appUrl("/today") },
    reason: "You're getting this because the daily email is on for your mentorOS account.",
    unsubscribe: { label: "Stop daily emails", url: links.page, settingsUrl: appUrl("/settings") },
  });

  return {
    to: to.email,
    subject: headline,
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
