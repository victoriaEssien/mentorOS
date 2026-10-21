import type { Metadata } from "next";

import { Screen, ScreenHeader } from "@/components/shell/screen";
import { mentorThread } from "@/server/learning/loop";
import { getPathOverview } from "@/server/queries/path";
import { requireLearner } from "@/server/session";

import { MentorChat } from "./mentor-chat";

export const metadata: Metadata = { title: "Mentor" };

export default async function MentorPage() {
  const { user } = await requireLearner();
  const [thread, path] = await Promise.all([mentorThread(user.id), getPathOverview(user.id)]);

  const focus = path.current?.skill?.name ?? null;
  const suggestions = [
    focus ? `Why is ${focus} my focus right now?` : "What should I learn first?",
    focus ? `Explain the idea behind ${focus} like I'm new to it` : "Explain how HTTP caching works",
    focus ? `I think I understand ${focus}. Test me.` : "I think I understand SQL joins. Test me.",
    "Can we move on to something harder?",
  ];

  return (
    // The composer rests on the dock, so the screen needs no room of its own below it.
    <Screen className="pb-[calc(env(safe-area-inset-bottom)+4rem)] lg:pb-0">
      <ScreenHeader title="Mentor" subtitle="Knows your record. Asks before it tells." />
      <MentorChat threadId={thread.id} initialMessages={thread.messages} suggestions={suggestions} />
    </Screen>
  );
}
