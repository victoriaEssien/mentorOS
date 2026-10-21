"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { learnerFields } from "@/lib/learner-fields";
import { changeSettings, refreshLearningPath } from "@/server/learning/loop";
import { getTaxonomy } from "@/server/queries/skills";
import { requireLearner } from "@/server/session";

export type SaveState = { error?: string };

// Any subset of what onboarding asked, validated exactly as onboarding validates it.
const settingsSchema = z.strictObject(learnerFields).partial();

export async function saveSettingsAction(changes: unknown): Promise<SaveState> {
  const { user } = await requireLearner();
  const parsed = settingsSchema.safeParse(changes);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That change couldn't be saved. Try again." };
  }

  if (parsed.data.trackIds) {
    const { tracks } = await getTaxonomy();
    const known = new Set(tracks.map((track) => track.id));
    if (!parsed.data.trackIds.every((id) => known.has(id))) {
      return { error: "One of those tracks no longer exists. Pick your tracks again." };
    }
  }

  const { replan } = await changeSettings(user.id, parsed.data);
  if (replan) {
    // Planning is a model call: the new path is drawn after this response, about half a minute.
    const userId = user.id;
    after(async () => {
      try {
        await refreshLearningPath(userId);
      } catch (error) {
        console.error(JSON.stringify({ event: "path.replan_failed", reason: String(error) }));
      }
    });
  }

  refresh();
  return {};
}

const nameSchema = z
  .string()
  .trim()
  .min(1, { error: "Your name can't be empty." })
  .max(80, { error: "Keep your name under 80 characters." });

export async function saveNameAction(name: unknown): Promise<SaveState> {
  await requireLearner();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "That name couldn't be saved." };

  await auth.api.updateUser({ body: { name: parsed.data }, headers: await headers() });
  refresh();
  return {};
}
