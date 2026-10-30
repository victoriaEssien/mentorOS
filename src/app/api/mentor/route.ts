import { z } from "zod";

import { getSession } from "@/lib/auth";
import { mentorTurn } from "@/server/learning/loop";
import { SlowDownError, ThreadNotFoundError } from "@/server/learning/mentor-chat";
import { getLearnerProfile } from "@/server/queries/learner";

// A turn can run a tool, such as a longer explanation, before it replies.
export const maxDuration = 120;

/**
 * Mentor chat endpoint (PRD §21). The client's useChat sends only the newest message; the thread,
 * the learner's record and the tools are all loaded here.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in to talk to your mentor." }, { status: 401 });
  const profile = await getLearnerProfile(session.user.id);
  if (!profile?.onboardingCompletedAt) {
    return Response.json({ error: "Finish getting started first." }, { status: 403 });
  }

  let body: { id?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "That message couldn't be read." }, { status: 400 });
  }

  try {
    return await mentorTurn(session.user.id, String(body.id ?? ""), body.message);
  } catch (error) {
    if (error instanceof ThreadNotFoundError) {
      return Response.json({ error: "This conversation doesn't exist." }, { status: 404 });
    }
    if (error instanceof SlowDownError) {
      return Response.json(
        { error: "That's a lot of messages in a few minutes. Give it a moment." },
        { status: 429 },
      );
    }
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Messages need some text, up to 4,000 characters." }, { status: 400 });
    }
    throw error;
  }
}
