import "server-only";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { getReminderPoint, getWeeklyDigest } from "@/server/queries/emails";

import { reminderEmail, weeklyProgressEmail } from "./engagement-emails";
import { sendEmail, type SendResult } from "./send";

/**
 * The once-a-day job (Vercel Cron, see vercel.json). On Mondays: weekly progress for anyone whose
 * work produced evidence in the last seven days. Every day: a reminder for anyone away four days
 * or more. Rules that keep it from becoming noise:
 *
 * - only confirmed addresses, and only the topics they haven't turned off;
 * - at most one of these emails a person a day, and each kind at most once a week;
 * - reminders stop after two go unanswered, and for anyone gone a month;
 * - never more than DAILY_SEND_CAP in a run.
 *
 * Each send is claimed in email_settings first, so a retried or overlapping run can't send twice.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Resend's free plan sends 100 emails a day; this leaves room for account emails. */
export const DAILY_SEND_CAP = 80;
const REMIND_AFTER_DAYS = 4;
const STOP_REMINDING_AFTER_DAYS = 30;
const MAX_UNANSWERED_REMINDERS = 2;
/** A week less a day: the job runs daily, so this lands each kind exactly a week apart. */
const ONCE_A_WEEK_MS = 6 * DAY_MS;
const SENDING_AT_ONCE = 4;

type Learner = { id: string; name: string | null; email: string; last_active?: string };

export type DailySummary = { weekly: number; reminders: number; logged: number; failed: number };

export async function runDailyEmails(now: Date = new Date()): Promise<DailySummary> {
  const summary: DailySummary = { weekly: 0, reminders: 0, logged: 0, failed: 0 };
  const count = (result: SendResult, kind: "weekly" | "reminders") => {
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
      const digest = await getWeeklyDigest(learner.id, since);
      count(await sendEmail(weeklyProgressEmail(recipient(learner), digest, weekKey)), "weekly");
    });
  }

  if (budget > 0) {
    const dayKey = now.toISOString().slice(0, 10);
    const learners = await reminderCandidates(now, budget);
    await eachInTurn(learners, async (learner) => {
      if (!learner.last_active || !(await claimReminder(learner.id, learner.last_active, now))) return;
      const point = await getReminderPoint(learner.id);
      count(await sendEmail(reminderEmail(recipient(learner), point, dayKey)), "reminders");
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
      and exists (
        select 1 from skill_evidence se
        where se.user_id = u.id and se.created_at >= ${new Date(now.getTime() - 7 * DAY_MS)}::timestamptz
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

/**
 * Away means no session use, evidence or mission activity for four days. A reminder that went
 * unanswered counts against them; coming back resets the count.
 */
async function reminderCandidates(now: Date, limit: number): Promise<Learner[]> {
  const { rows } = await db.execute(sql`
    select u.id, u.name, u.email, a.last_active
    from "user" u
    join learner_profile lp on lp.user_id = u.id and lp.onboarding_completed_at is not null
    cross join lateral (
      select greatest(
        (select max(s.updated_at) from session s where s.user_id = u.id),
        (select max(se.created_at) from skill_evidence se where se.user_id = u.id),
        (select max(m.updated_at) from mission m where m.user_id = u.id)
      ) as last_active
    ) a
    left join email_settings es on es.user_id = u.id
    where u.email_verified
      and coalesce(es.reminders, true)
      and a.last_active <= ${new Date(now.getTime() - REMIND_AFTER_DAYS * DAY_MS)}::timestamptz
      and a.last_active >= ${new Date(now.getTime() - STOP_REMINDING_AFTER_DAYS * DAY_MS)}::timestamptz
      and (es.last_reminder_at is null or es.last_reminder_at < ${new Date(now.getTime() - ONCE_A_WEEK_MS)}::timestamptz)
      and (
        es.last_reminder_at is null
        or a.last_active > es.last_reminder_at
        or es.reminders_unanswered < ${MAX_UNANSWERED_REMINDERS}
      )
      and (es.last_weekly_at is null or es.last_weekly_at < ${new Date(now.getTime() - DAY_MS / 2)}::timestamptz)
    order by a.last_active desc
    limit ${limit}
  `);
  return rows as Learner[];
}

async function claimReminder(userId: string, lastActive: string, now: Date): Promise<boolean> {
  const { rows } = await db.execute(sql`
    insert into email_settings (user_id, last_reminder_at, reminders_unanswered, updated_at)
    values (${userId}, ${now}::timestamptz, 1, ${now}::timestamptz)
    on conflict (user_id) do update set
      last_reminder_at = excluded.last_reminder_at,
      reminders_unanswered = case
        when email_settings.last_reminder_at is null
          or ${lastActive}::timestamptz > email_settings.last_reminder_at then 1
        else email_settings.reminders_unanswered + 1
      end,
      updated_at = excluded.updated_at
    where email_settings.last_reminder_at is null
      or email_settings.last_reminder_at < ${new Date(now.getTime() - ONCE_A_WEEK_MS)}::timestamptz
    returning user_id
  `);
  return rows.length > 0;
}
