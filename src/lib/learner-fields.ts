import { z } from "zod";

import { goalOptions, learningStyleOptions, toneOptions, weeklyHourOptions } from "@/lib/onboarding-options";

/**
 * Validation for what a learner tells us about themselves, shared by onboarding (which asks for
 * all of it) and settings (which changes one thing at a time), so both accept exactly the same
 * answers.
 */

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

export const learnerFields = {
  goals: z.array(z.enum(goalOptions)).max(goalOptions.length),
  customGoal: optionalText(200),
  weeklyLearningHours: z
    .number()
    .refine((value) => weeklyHourOptions.some((option) => option.value === value))
    .nullable(),
  learningStyle: z.enum(learningStyleOptions).nullable(),
  mentorTone: z.enum(toneOptions.map((option) => option.value)),
};
