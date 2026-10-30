import "server-only";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { getDailyDigest, getWeeklyDigest } from "@/server/queries/emails";

import { dailyEmail, weeklyProgressEmail } from "./engagement-emails";
import { sendEmail, type SendResult } from "./send";

/**
 * The once-a-day job (Vercel Cron, see vercel.json). On Mondays: weekly progress for anyone who
 * explained a concept or handed in a project in the last seven days. Every day: the daily email for everyone else who
 * has it on, whether they were busy yesterday or away for a month. Rules that keep it sane:
 *
 * - only confirmed addresses, and only the topics they haven't turned off;
 * - at most one of these emails a person a day (a Monday weekly email takes the daily one's place);
 * - never more than DAILY_SEND_CAP in a run.
 *
 * Each send is claimed in email_settings first, so a retried or overlapping run can't send twice.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Resend's free plan sends 100 emails a day; this leaves room for account emails. */
export const DAILY_SEND_CAP = 80;
/** A week less a day: the job runs daily, so this lands each weekly email exactly a week apart. */
const ONCE_A_WEEK_MS = 6 * DAY_MS;
/** Less than a day, so a run that drifts later than yesterday's still sends. */
const ONCE_A_DAY_MS = 20 * 60 * 60 * 1000;
const SENDING_AT_ONCE = 4;

type Learner = { id: string; name: string | null; email: string };

export type DailySummary = { weekly: number; daily: number; logged: number; failed: number };

export async function runDailyEmails(now: Date = new Date()): Promise<DailySummary> {
  const summary: DailySummary = { weekly: 0, daily: 0, logged: 0, failed: 0 };
  const count = (result: SendResult, kind: "weekly" | "daily") => {
    if (result === "sent") summary[kind]++;
    else summary[result]++;
  };
  let budget = DAILY_SEND_CAP;

  if (now.getUTCDay() === 1) {
    const since = new Date(now.getTime() - 7 * DAY_MS);
    const weekKey = now.toISOString().slice(0, 10);
    const learners = await weeklyCandidates(now, budget);
    await eachInTurn(learners, async (learner) => {
      if (!(await claimWeekly(learner.id, now))) return;
      budget--;
      const digest = await getWeeklyDigest(learner.id, since, now);
      count(await sendEmail(weeklyProgressEmail(recipient(learner), digest, weekKey)), "weekly");
    });
  }

  if (budget > 0) {
    const dayKey = now.toISOString().slice(0, 10);
    const learners = await dailyCandidates(now, budget);
    await eachInTurn(learners, async (learner) => {
      if (!(await claimDaily(learner.id, now))) return;
      const digest = await getDailyDigest(learner.id, now);
      count(await sendEmail(dailyEmail(recipient(learner), digest, dayKey)), "daily");
    });
  }

  console.info(JSON.stringify({ event: "email.daily", ...summary }));
  return summary;
}

const recipient = (learner: Learner) => ({ userId: learner.id, name: learner.name, email: learner.email });

/** A few at a time: quick enough for the function's time limit, gentle on the email API. */
async function eachInTurn<T>(items: T[], work: (item: T) => Promise<void>): Promise<void> {
  for (let start = 0; start < items.length; start += SENDING_AT_ONCE) {
    await Promise.all(
      items.slice(start, start + SENDING_AT_ONCE).map((item) =>
        work(item).catch((error) => {
          console.error(JSON.stringify({ event: "email.daily_item_failed", reason: String(error) }));
        }),
      ),
    );
  }
}

async function weeklyCandidates(now: Date, limit: number): Promise<Learner[]> {
  const { rows } = await db.execute(sql`
    select u.id, u.name, u.email
    from "user" u
    join learner_profile lp on lp.user_id = u.id and lp.onboarding_completed_at is not null
    left join email_settings es on es.user_id = u.id
    where u.email_verified
      and coalesce(es.weekly_progress, true)
      and (es.last_weekly_at is null or es.last_weekly_at < ${new Date(now.getTime() - ONCE_A_WEEK_MS)}::timestamptz)
      and (
        exists (
          select 1 from concept_attempt ca
          where ca.user_id = u.id and ca.explained_at >= ${new Date(now.getTime() - 7 * DAY_MS)}::timestamptz
        )
        or exists (
          select 1 from mission_submission ms
          where ms.user_id = u.id and ms.submitted_at >= ${new Date(now.getTime() - 7 * DAY_MS)}::timestamptz
        )
      )
    order by es.last_weekly_at asc nulls first
    limit ${limit}
  `);
  return rows as Learner[];
}

async function claimWeekly(userId: string, now: Date): Promise<boolean> {
  const { rows } = await db.execute(sql`
    insert into email_settings (user_id, last_weekly_at, updated_at)
    values (${userId}, ${now}::timestamptz, ${now}::timestamptz)
    on conflict (user_id) do update set last_weekly_at = excluded.last_weekly_at, updated_at = excluded.updated_at
    where email_settings.last_weekly_at is null
      or email_settings.last_weekly_at < ${new Date(now.getTime() - ONCE_A_WEEK_MS)}::timestamptz
    returning user_id
  `);
  return rows.length > 0;
}

/** Everyone with the daily email on who hasn't had today's email, or a weekly one this morning. */
async function dailyCandidates(now: Date, limit: number): Promise<Learner[]> {
  const { rows } = await db.execute(sql`
    select u.id, u.name, u.email
    from "user" u
    join learner_profile lp on lp.user_id = u.id and lp.onboarding_completed_at is not null
    left join email_settings es on es.user_id = u.id
    where u.email_verified
      and coalesce(es.reminders, true)
      and (es.last_reminder_at is null or es.last_reminder_at < ${new Date(now.getTime() - ONCE_A_DAY_MS)}::timestamptz)
      and (es.last_weekly_at is null or es.last_weekly_at < ${new Date(now.getTime() - DAY_MS / 2)}::timestamptz)
    order by es.last_reminder_at asc nulls first
    limit ${limit}
  `);
  return rows as Learner[];
}

async function claimDaily(userId: string, now: Date): Promise<boolean> {
  const { rows } = await db.execute(sql`
    insert into email_settings (user_id, last_reminder_at, updated_at)
    values (${userId}, ${now}::timestamptz, ${now}::timestamptz)
    on conflict (user_id) do update set last_reminder_at = excluded.last_reminder_at, updated_at = excluded.updated_at
    where email_settings.last_reminder_at is null
      or email_settings.last_reminder_at < ${new Date(now.getTime() - ONCE_A_DAY_MS)}::timestamptz
    returning user_id
  `);
  return rows.length > 0;
}
