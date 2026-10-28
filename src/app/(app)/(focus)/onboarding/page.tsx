import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getLearnerProfile } from "@/server/queries/learner";
import { getTaxonomy } from "@/server/queries/skills";
import { requireUser } from "@/server/session";

import { OnboardingWizard } from "./wizard";

export const metadata: Metadata = { title: "Get started" };

// Finishing onboarding writes the diagnostic with the model, which can take a minute.
export const maxDuration = 120;

export default async function OnboardingPage() {
  const user = await requireUser();
  const [profile, { tracks }] = await Promise.all([getLearnerProfile(user.id), getTaxonomy()]);
  if (profile?.onboardingCompletedAt) redirect("/today");

  return (
    <OnboardingWizard
      tracks={tracks
        .filter((track) => !track.shelved)
        .map((track) => ({ id: track.id, name: track.name, description: track.description }))}
      initial={
        profile
          ? {
              goals: profile.goals as never,
              customGoal: profile.customGoal,
              currentRole: profile.currentRole,
              yearsExperience: profile.yearsExperience,
              technologiesUsed: profile.technologiesUsed,
              previousLearning: profile.previousLearning,
              existingProjects: profile.existingProjects,
              weeklyLearningHours: profile.weeklyLearningHours,
              learningStyle: profile.learningStyle as never,
              mentorTone: profile.mentorTone,
            }
          : {}
      }
    />
  );
}
