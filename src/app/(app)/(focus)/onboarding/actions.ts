"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  experienceOptions,
  goalOptions,
  learningStyleOptions,
  toneOptions,
  weeklyHourOptions,
} from "@/lib/onboarding-options";
import { completeOnboarding } from "@/server/learning/loop";
import { getTaxonomy } from "@/server/queries/skills";
import { requireUser } from "@/server/session";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

const onboardingSchema = z.object({
  trackIds: z.array(z.string()).min(1, { error: "Pick at least one track." }).max(6),
  goals: z.array(z.enum(goalOptions)).max(goalOptions.length),
  customGoal: optionalText(200),
  currentRole: optionalText(120),
  yearsExperience: z
    .number()
    .refine((value) => experienceOptions.some((option) => option.value === value))
    .nullable(),
  technologiesUsed: z.array(z.string().trim().min(1).max(40)).max(30),
  previousLearning: optionalText(1000),
  existingProjects: optionalText(1000),
  weeklyLearningHours: z
    .number()
    .refine((value) => weeklyHourOptions.some((option) => option.value === value))
    .nullable(),
  learningStyle: z.enum(learningStyleOptions).nullable(),
  mentorTone: z.enum(toneOptions.map((option) => option.value)),
});

export type OnboardingAnswers = z.input<typeof onboardingSchema>;

export type OnboardingState = { error?: string };

export async function completeOnboardingAction(
  _previous: OnboardingState,
  answers: OnboardingAnswers,
): Promise<OnboardingState> {
  const user = await requireUser();

  const parsed = onboardingSchema.safeParse(answers);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Some answers are missing. Go back and check them." };
  }

  const { tracks } = await getTaxonomy();
  const knownTracks = new Set(tracks.map((track) => track.id));
  if (!parsed.data.trackIds.every((id) => knownTracks.has(id))) {
    return { error: "One of those tracks no longer exists. Pick your tracks again." };
  }

  const { assessmentId } = await completeOnboarding(user.id, {
    ...parsed.data,
    technologiesUsed: [...new Set(parsed.data.technologiesUsed)],
  });

  redirect(assessmentId ? `/assessments/${assessmentId}` : "/today");
}
