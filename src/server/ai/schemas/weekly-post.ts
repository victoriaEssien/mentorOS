import { z } from "zod";

/** Structured output of the Post Drafter: one week, as a LinkedIn post and an X post. */
export const draftedPostSchema = z.object({
  linkedin: z.string().describe("The LinkedIn post: 120 to 220 words, short paragraphs, plain text"),
  x: z.string().describe("The X post: one post, at most 270 characters"),
  drewOn: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("What the posts drew on, a few words each, e.g. 'Redis rate limiter, passed'"),
});

export type DraftedPost = z.infer<typeof draftedPostSchema>;
