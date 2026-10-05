import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, mentorRole, updatedAt } from "./_shared";
import { user } from "./auth";
import { mission } from "./learning";

/** Mentor chat threads (PRD §21). Optionally anchored to the mission being worked on. */
export const mentorConversation = pgTable(
  "mentor_conversation",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    missionId: uuid().references(() => mission.id, { onDelete: "set null" }),
    title: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)],
);

/** One message. `parts` stores AI SDK UI message parts as-is. */
export const mentorMessage = pgTable(
  "mentor_message",
  {
    id: id(),
    conversationId: uuid()
      .notNull()
      .references(() => mentorConversation.id, { onDelete: "cascade" }),
    role: mentorRole().notNull(),
    parts: jsonb().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.conversationId, t.createdAt)],
);
