import type { Metadata } from "next";

import { signOutAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/form/submit-button";
import { Screen, ScreenHeader, ScreenSection } from "@/components/shell/screen";
import { getLearnerTrackIds } from "@/server/queries/learner";
import { getTaxonomy } from "@/server/queries/skills";
import { requireLearner } from "@/server/session";

import {
  GoalsSetting,
  LearningStyleSetting,
  NameSetting,
  ToneSetting,
  TracksSetting,
  WeeklyTimeSetting,
} from "./settings-sheets";

export const metadata: Metadata = { title: "Settings" };

// Changing tracks replans the path after the response, with a model call.
export const maxDuration = 60;

const GROUP = "divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-window";

/** Settings (PRD §8): everything onboarding asked, changeable one row at a time. */
export default async function SettingsPage() {
  const { user, profile } = await requireLearner();
  const [{ tracks }, trackIds] = await Promise.all([getTaxonomy(), getLearnerTrackIds(user.id)]);

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
        </div>
      </ScreenSection>

      <ScreenSection title="Learning">
        <div className={GROUP}>
          <TracksSetting
            tracks={tracks.map(({ id, name, description }) => ({ id, name, description }))}
            selected={trackIds}
          />
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

      <form action={signOutAction} className="mt-10">
        <SubmitButton variant="secondary" pendingLabel="Signing out" className="w-full">
          Sign out
        </SubmitButton>
      </form>
    </Screen>
  );
}
