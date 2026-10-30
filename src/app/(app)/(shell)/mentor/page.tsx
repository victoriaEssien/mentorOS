import type { Metadata } from "next";
import { cookies } from "next/headers";

import { Screen, ScreenHeader } from "@/components/shell/screen";
import { findConcept } from "@/lib/themes";
import { knownTimeZone, TIME_ZONE_COOKIE, today } from "@/lib/local-time";
import { dailySession, mentorThread } from "@/server/learning/loop";
import { getThemeProject } from "@/server/queries/missions";
import { requireLearner } from "@/server/session";

import { MentorChat } from "./mentor-chat";

export const metadata: Metadata = { title: "Mentor" };

export default async function MentorPage() {
  const { user } = await requireLearner();
  const day = today(knownTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value));
  const [thread, session] = await Promise.all([mentorThread(user.id), dailySession(user.id, day)]);
  const project = await getThemeProject(user.id, session.themeDay.run.missionId);
  const fresh = session.attempts.find((attempt) => attempt.kind === "new");
  const concept = fresh ? (findConcept(fresh.conceptSlug)?.concept ?? null) : null;
  const suggestions = [
    concept ? `Where should I start researching ${concept.title}?` : "Where should I start today?",
    project
      ? `I'm stuck on "${project.title}". Help me think it through.`
      : "What makes a project worth showing off?",
    concept ? `Give me some code on ${concept.title} to explain` : "Give me some code to explain",
    "Review my approach before I build it",
  ];

  return (
    // The composer rests on the dock, so the screen needs no room of its own below it.
    <Screen className="pb-[calc(env(safe-area-inset-bottom)+4rem)] lg:pb-0">
      <ScreenHeader title="Mentor" subtitle="Ask when you're stuck. Pip asks before it tells." />
      <MentorChat threadId={thread.id} initialMessages={thread.messages} suggestions={suggestions} />
    </Screen>
  );
}
