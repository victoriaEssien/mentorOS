import "server-only";

import { NotImplementedError } from "@/lib/errors";

import type { LearnerContext } from "../context";
import { models } from "../provider";

/**
 * Mentor
 *
 * The conversational interface to the system (PRD §21, §22).
 * Hints before answers during assessments, challenges assumptions, tests claimed understanding,
 * explains why it assigns things, and can say "not yet". Delegates to other modules via tools.
 */

export const PROMPT_VERSION = "v0";

const SYSTEM_PROMPT = `
TODO: Mentor system prompt.
`;

export type MentorTurnInput = {
  context: LearnerContext;
  conversationId: string;
  /** AI SDK UI messages from the client. */
  messages: unknown[];
  /** True while the learner is inside an assessment: hints only, never answers. */
  inAssessment: boolean;
};

export async function streamMentorReply(input: MentorTurnInput): Promise<Response> {
  void input;
  void models.fast;
  void SYSTEM_PROMPT;
  throw new NotImplementedError("mentor.streamMentorReply");
}
