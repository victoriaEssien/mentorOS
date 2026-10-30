import "server-only";

import { generateStructured, type GenerationMeta } from "../generate";
import { draftedPostSchema, type DraftedPost } from "../schemas";

/**
 * Post Drafter
 *
 * Turns a reviewed project into a short post for X and LinkedIn: what they built and what was hard,
 * written only from the project, its review and their own reflection. Does not write to the
 * database.
 */

export const PROMPT_VERSION = "v3";

const SYSTEM_PROMPT = `
You draft a short "learning in public" post about a project a software engineer just built. They
will edit it and post it themselves, as themselves.

Truth first:
- Use only what THE PROJECT below shows. Never invent features, numbers, users, companies or
  feelings. If the review found something missing, don't claim it.
- Say what they built and in what, then what was hard and how they got past it (or didn't). Their
  own words about what they learned and got wrong are the best material; keep their meaning.
- One concrete detail beats three adjectives.

Voice: first person, plain and direct, like an engineer talking to other engineers. No hype
("excited to share", "game changer", "journey", "dive deep"), no emoji, no em dashes. Don't name the
tool that set the work.

LinkedIn: 120 to 220 words in short paragraphs. Open with the most interesting concrete thing, not
a greeting. End with the repo link on its own line if there is one, then at most two specific
hashtags (#stripe yes, #coding no).

X: one post, at most 270 characters, standalone: the build and the hard part. No link, no hashtags
unless one is genuinely useful.

drewOn: what the posts are based on, a few words each.
`.trim();

export type PostProject = {
  theme: string;
  title: string;
  stack: string | null;
  objective: string;
  outcome: string;
  strengths: string[];
  weaknesses: string[];
  learned: string | null;
  gotWrong: string | null;
  repo: string | null;
};

export async function draftProjectPost(
  project: PostProject,
  abortSignal?: AbortSignal,
): Promise<{ post: DraftedPost; meta: GenerationMeta }> {
  const prompt = [
    "THE PROJECT",
    `Theme: ${project.theme}`,
    `Built: ${project.title}${project.stack ? ` (${project.stack})` : ""}. ${project.objective}`,
    `Review: ${project.outcome}.`,
    ...(project.strengths.length > 0 ? [`What the review found strong: ${project.strengths.join(" ")}`] : []),
    ...(project.weaknesses.length > 0
      ? [`What the review found missing: ${project.weaknesses.join(" ")}`]
      : []),
    ...(project.learned ? [`They learned: ${project.learned}`] : []),
    ...(project.gotWrong ? [`They got wrong: ${project.gotWrong}`] : []),
    ...(project.repo ? [`Repo: ${project.repo}`] : []),
  ].join("\n");

  const { output, meta } = await generateStructured({
    module: "post-drafter",
    promptVersion: PROMPT_VERSION,
    tier: "smart",
    instructions: SYSTEM_PROMPT,
    prompt,
    schema: draftedPostSchema,
    schemaName: "ProjectPost",
    schemaDescription: "A project as a LinkedIn post and an X post.",
    maxOutputTokens: 3_000,
    timeoutMs: 90_000,
    abortSignal,
  });
  return { post: output, meta };
}
