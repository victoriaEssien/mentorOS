import type { Metadata } from "next";

import { signOutAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/form/submit-button";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { getEmailSettings, hasPassword } from "@/server/queries/learner";
import { requireLearner } from "@/server/session";

import {
  ConfirmEmailSetting,
  EmailSwitches,
  GoalsSetting,
  LearningStyleSetting,
  NameSetting,
  PasswordSetting,
  ToneSetting,
  WeeklyTimeSetting,
} from "./settings-sheets";

export const metadata: Metadata = { title: "Settings" };

const GROUP = "divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-window";

/** Settings (PRD §8): what onboarding asked, changeable one row at a time. */
export default async function SettingsPage() {
  const { user, profile } = await requireLearner();
  const [withPassword, emails] = await Promise.all([hasPassword(user.id), getEmailSettings(user.id)]);

  return (
    <Screen>
      <ScreenHeader title="Settings" back={{ href: "/profile", label: "You" }} />

      <ScreenSection title="Account">
        <div className={GROUP}>
          <NameSetting name={user.name} />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="shrink-0 text-body">Email</span>
            <span className="ml-auto min-w-0 truncate text-callout text-muted-foreground">{user.email}</span>
          </div>
          {user.emailVerified ? null : <ConfirmEmailSetting email={user.email} />}
          {withPassword ? <PasswordSetting /> : null}
        </div>
      </ScreenSection>

      <ScreenSection title="Learning">
        <div className={GROUP}>
          <GoalsSetting goals={profile.goals} customGoal={profile.customGoal} />
          <WeeklyTimeSetting hours={profile.weeklyLearningHours} />
          <LearningStyleSetting style={profile.learningStyle} />
        </div>
      </ScreenSection>

      <ScreenSection title="Mentor">
        <div className={GROUP}>
          <ToneSetting tone={profile.mentorTone} />
        </div>
      </ScreenSection>

      <ScreenSection title="Emails">
        <div className={GROUP}>
          <EmailSwitches weekly={emails.weekly} reminders={emails.reminders} />
        </div>
        <p className="mt-2.5 text-footnote text-muted-foreground">
          {user.emailVerified
            ? "Emails about your account, like a password reset, always come."
            : "These start once your email is confirmed. Emails about your account always come."}
        </p>
      </ScreenSection>

      <form action={signOutAction} className="mt-10">
        <SubmitButton variant="secondary" pendingLabel="Signing out" className="w-full">
          Sign out
        </SubmitButton>
      </form>
    </Screen>
  );
}
