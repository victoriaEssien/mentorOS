"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { AiGenerationError } from "@/server/ai/generate";
import { refreshLearningPath, submitMission } from "@/server/learning/loop";
import { MissionNotFoundError } from "@/server/learning/missions";
import { MissionClosedError, MissionExpiredError } from "@/server/learning/submissions";
import { requireLearner } from "@/server/session";

export type HandInState = {
  error?: string;
  fieldErrors?: Partial<Record<"content" | "links", string>>;
};

const optionalText = z
  .string()
  .trim()
  .max(2000, "Keep each reflection under 2,000 characters.")
  .transform((value) => value || undefined);

const handInSchema = z.object({
  content: z
    .string()
    .trim()
    .min(20, "Explain what you did and why, in a few sentences at least.")
    .max(20_000, "That's over 20,000 characters. Link the rest from a repository or gist."),
  links: z
    .array(z.string().trim())
    .transform((links) => links.filter(Boolean))
    .pipe(
      z
        .array(
          z
            .url({ protocol: /^https?$/, message: "Links need to start with https://." })
            .max(500, "That link is too long."),
        )
        .max(3, "Up to three links."),
    ),
  reflection: z.object({
    difficult: optionalText,
    understoodBetter: optionalText,
    wouldChange: optionalText,
    stillConfused: optionalText,
  }),
});

export async function handInAction(
  missionId: string,
  _previous: HandInState,
  formData: FormData,
): Promise<HandInState> {
  const { user } = await requireLearner();

  const parsed = handInSchema.safeParse({
    content: formData.get("content") ?? "",
    links: formData.getAll("link").map(String),
    reflection: {
      difficult: formData.get("difficult") ?? "",
      understoodBetter: formData.get("understoodBetter") ?? "",
      wouldChange: formData.get("wouldChange") ?? "",
      stillConfused: formData.get("stillConfused") ?? "",
    },
  });
  if (!parsed.success) {
    const fieldErrors: HandInState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "content" || field === "links") && !fieldErrors[field])
        fieldErrors[field] = issue.message;
    }
    return {
      fieldErrors,
      error: fieldErrors.content || fieldErrors.links ? undefined : parsed.error.issues[0]?.message,
    };
  }

  const { content, links, reflection } = parsed.data;
  const answered = Object.values(reflection).some(Boolean);

  try {
    const { pathFinished } = await submitMission(user.id, missionId, {
      content,
      links,
      reflection: answered ? reflection : null,
    });
    // The path ran out of steps: plan the next one while they read the evaluation.
    if (pathFinished) after(() => replanQuietly(user.id));
  } catch (error) {
    if (error instanceof MissionNotFoundError) return { error: "This mission no longer exists." };
    if (error instanceof MissionClosedError) redirect(`/missions/${missionId}`);
    if (error instanceof MissionExpiredError) {
      return {
        error:
          "Time ran out on this mission before you handed it in, so it's recorded as missed and won't be scored. Copy your work if you want to keep it.",
      };
    }
    console.error(JSON.stringify({ event: "mission.evaluation_failed", missionId, reason: String(error) }));
    return {
      error:
        error instanceof AiGenerationError
          ? "The evaluation didn't come back in a usable shape. Your work is saved; hand it in again."
          : "Evaluating didn't finish. Your work is saved; try handing it in again in a moment.",
    };
  }

  redirect(`/missions/${missionId}/evaluation`);
}

async function replanQuietly(userId: string) {
  try {
    await refreshLearningPath(userId);
  } catch (error) {
    console.error(JSON.stringify({ event: "path.plan_failed", userId, reason: String(error) }));
  }
}
