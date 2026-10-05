import { getSession } from "@/lib/auth";

/**
 * Mentor chat endpoint (PRD §21). The client uses useChat from @ai-sdk/react against this route.
 * TODO: buildLearnerContext → mentor.streamMentorReply → persist messages.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  return new Response("Mentor chat is not implemented yet.", { status: 501 });
}
