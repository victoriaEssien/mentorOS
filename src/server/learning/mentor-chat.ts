import "server-only";
import {
  createUIMessageStreamResponse,
  toUIMessageStream,
  TypeValidationError,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { mentorConversation, mentorMessage } from "@/db/schema";
import { buildLearnerContext } from "@/server/ai/context";
import { streamMentorReply } from "@/server/ai/modules/mentor";

import { mentorTools } from "./mentor-tools";

/**
 * The mentor thread (PRD §21): one ongoing conversation per learner, stored as AI SDK UI messages
 * so it renders exactly as it streamed. The model sees the learner's current record on every turn,
 * plus the recent part of the thread.
 */

/** How much of the thread the model sees, and how much the screen loads. */
const MODEL_HISTORY = 24;
const SCREEN_HISTORY = 80;

/** Each turn costs a model call; this is plenty for a person and stops a runaway script. */
const RATE_LIMIT = { messages: 30, windowMs: 10 * 60_000 };

const uuid = z.uuid();

export class ThreadNotFoundError extends Error {
  constructor() {
    super("Conversation not found");
    this.name = "ThreadNotFoundError";
  }
}

export class SlowDownError extends Error {
  constructor() {
    super("Too many messages");
    this.name = "SlowDownError";
  }
}

/** The learner's thread with its recent messages, started on first visit. */
export async function getMentorThread(userId: string): Promise<{ id: string; messages: UIMessage[] }> {
  const [existing] = await db
    .select({ id: mentorConversation.id })
    .from(mentorConversation)
    .where(and(eq(mentorConversation.userId, userId), isNull(mentorConversation.missionId)))
    .orderBy(desc(mentorConversation.updatedAt))
    .limit(1);

  const id = existing?.id ?? crypto.randomUUID();
  if (!existing) await db.insert(mentorConversation).values({ id, userId, title: "Mentor" });

  return { id, messages: await loadMessages(id, SCREEN_HISTORY) };
}

async function loadMessages(conversationId: string, limit: number): Promise<UIMessage[]> {
  const rows = await db
    .select({ id: mentorMessage.id, role: mentorMessage.role, parts: mentorMessage.parts })
    .from(mentorMessage)
    .where(eq(mentorMessage.conversationId, conversationId))
    .orderBy(desc(mentorMessage.createdAt))
    .limit(limit);
  return rows
    .reverse()
    .map((row) => ({ id: row.id, role: row.role, parts: row.parts as UIMessage["parts"] }));
}

async function saveMessage(conversationId: string, message: UIMessage) {
  await db.batch([
    db
      .insert(mentorMessage)
      .values({ id: message.id, conversationId, role: message.role, parts: message.parts })
      .onConflictDoUpdate({ target: mentorMessage.id, set: { parts: message.parts } }),
    db
      .update(mentorConversation)
      .set({ updatedAt: new Date() })
      .where(eq(mentorConversation.id, conversationId)),
  ]);
}

/**
 * One turn: stores the learner's message, streams the mentor's reply (tools included), and stores
 * the reply when the stream ends.
 */
export async function replyInThread(
  userId: string,
  conversationId: string,
  message: unknown,
): Promise<Response> {
  if (!uuid.safeParse(conversationId).success) throw new ThreadNotFoundError();
  const [thread] = await db
    .select({ id: mentorConversation.id })
    .from(mentorConversation)
    .where(and(eq(mentorConversation.id, conversationId), eq(mentorConversation.userId, userId)))
    .limit(1);
  if (!thread) throw new ThreadNotFoundError();

  const [{ sent }] = await db
    .select({ sent: count() })
    .from(mentorMessage)
    .innerJoin(mentorConversation, eq(mentorConversation.id, mentorMessage.conversationId))
    .where(
      and(
        eq(mentorConversation.userId, userId),
        eq(mentorMessage.role, "user"),
        gt(mentorMessage.createdAt, new Date(Date.now() - RATE_LIMIT.windowMs)),
      ),
    );
  if (sent >= RATE_LIMIT.messages) throw new SlowDownError();

  const context = await buildLearnerContext(userId);
  const tools = mentorTools(userId, context);

  // Only the learner's own text comes from the client; ids are the server's.
  const incoming = z
    .object({
      parts: z.array(z.object({ type: z.literal("text"), text: z.string().trim().min(1).max(4000) })).min(1),
    })
    .parse(message);
  const userMessage: UIMessage = { id: crypto.randomUUID(), role: "user", parts: incoming.parts };

  let history = await loadMessages(conversationId, MODEL_HISTORY);
  try {
    history = await validateUIMessages({ messages: history, tools });
  } catch (error) {
    // Stored messages from an older tool shape: start the model fresh rather than fail the turn.
    if (!(error instanceof TypeValidationError)) throw error;
    history = [];
  }
  await saveMessage(conversationId, userMessage);

  const messages = [...history, userMessage];
  const result = await streamMentorReply({ mode: "chat", context, messages, tools });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: () => crypto.randomUUID(),
      onEnd: async ({ responseMessage }) => {
        await saveMessage(conversationId, responseMessage);
      },
    }),
  });
}
