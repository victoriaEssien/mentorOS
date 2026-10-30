"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { AiGenerationError } from "@/server/ai/generate";
import { projectPostDraft, submitMission } from "@/server/learning/loop";
import { MissionNotFoundError } from "@/server/learning/missions";
import { MissionClosedError, MissionExpiredError } from "@/server/learning/submissions";
import { requireLearner } from "@/server/session";

export type HandInState = {
  error?: string;
  fieldErrors?: Partial<Record<"content" | "links" | "learned" | "gotWrong", string>>;
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
    learned: z
      .string()
      .trim()
      .min(10, "Say what you learned, in a sentence or two.")
      .max(2000, "Keep each reflection under 2,000 characters."),
    gotWrong: z
      .string()
      .trim()
      .min(10, "Say what you got wrong, or nearly did. Everyone gets something wrong.")
      .max(2000, "Keep each reflection under 2,000 characters."),
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
      learned: formData.get("learned") ?? "",
      gotWrong: formData.get("gotWrong") ?? "",
      wouldChange: formData.get("wouldChange") ?? "",
      stillConfused: formData.get("stillConfused") ?? "",
    },
  });
  if (!parsed.success) {
    const fieldErrors: HandInState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      // Reflection answers sit one level down: ["reflection", "learned"].
      const field = issue.path[0] === "reflection" ? issue.path[1] : issue.path[0];
      if (
        (field === "content" || field === "links" || field === "learned" || field === "gotWrong") &&
        !fieldErrors[field]
      ) {
        fieldErrors[field] = issue.message;
      }
    }
    return {
      fieldErrors,
      error: Object.keys(fieldErrors).length > 0 ? undefined : parsed.error.issues[0]?.message,
    };
  }

  const { content, links, reflection } = parsed.data;
  const answered = Object.values(reflection).some(Boolean);

  try {
    await submitMission(user.id, missionId, {
      content,
      links,
      reflection: answered ? reflection : null,
    });
    // The post is drafted while they read the review.
    const userId = user.id;
    after(async () => {
      try {
        await projectPostDraft(userId, missionId);
      } catch (error) {
        console.error(JSON.stringify({ event: "post.draft_failed", missionId, reason: String(error) }));
      }
    });
  } catch (error) {
    if (error instanceof MissionNotFoundError) return { error: "This project no longer exists." };
    if (error instanceof MissionClosedError) redirect(`/projects/${missionId}`);
    if (error instanceof MissionExpiredError) {
      return {
        error:
          "Time ran out on this project before you handed it in, so it's recorded as missed and won't be reviewed. Copy your work if you want to keep it.",
      };
    }
    console.error(JSON.stringify({ event: "mission.evaluation_failed", missionId, reason: String(error) }));
    return {
      error:
        error instanceof AiGenerationError
          ? "The review didn't come back in a usable shape. Your work is saved; hand it in again."
          : "The review didn't finish. Your work is saved; try handing it in again in a moment.",
    };
  }

  redirect(`/projects/${missionId}/evaluation`);
}
