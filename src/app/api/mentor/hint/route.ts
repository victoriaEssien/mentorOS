import { z } from "zod";

import { getSession } from "@/lib/auth";
import {
  AssessmentClosedError,
  AssessmentNotFoundError,
  HintLimitError,
  MAX_HINTS_PER_QUESTION,
} from "@/server/learning/attempts";
import { assessmentHint } from "@/server/learning/loop";

export const maxDuration = 60;

/** Hint-only mentor inside the assessment player (PRD §22). */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in to ask for a hint." }, { status: 401 });

  let body: { assessmentId?: unknown; itemId?: unknown; messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "That request couldn't be read." }, { status: 400 });
  }

  try {
    return await assessmentHint(
      session.user.id,
      String(body.assessmentId ?? ""),
      String(body.itemId ?? ""),
      body.messages,
    );
  } catch (error) {
    if (error instanceof AssessmentNotFoundError) {
      return Response.json(
        { error: "This question isn't part of an assessment you're taking." },
        { status: 404 },
      );
    }
    if (error instanceof AssessmentClosedError) {
      return Response.json({ error: "You've already handed this in." }, { status: 409 });
    }
    if (error instanceof HintLimitError) {
      return Response.json(
        {
          error: `That's all ${MAX_HINTS_PER_QUESTION} hints for this question. Give it your best answer; "I don't know" is an answer too.`,
        },
        { status: 429 },
      );
    }
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Ask in a few words, up to 2,000 characters." }, { status: 400 });
    }
    throw error;
  }
}
