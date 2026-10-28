import "server-only";

import { generateStructured, type GenerationMeta } from "../generate";
import { draftedPostSchema, type DraftedPost } from "../schemas";

/**
 * Post Drafter
 *
 * Turns a learner's week into a LinkedIn post and an X post (Part E): learning in public, written
 * only from what the week's evidence shows. Does not write to the database.
 */

export const PROMPT_VERSION = "v1";

const SYSTEM_PROMPT = `
You draft a weekly "learning in public" post for a software engineer who is working toward the
interview bar at top companies. They will edit it and post it themselves, as themselves.

Truth first:
- Use only what THE WEEK below shows. Never invent a project, a result, a number, a link, a company
  or a feeling. If a mission wasn't handed in or didn't pass, don't say it was built or shipped.
- Prefer specifics: what they built and in what, the problem kinds they solved, tests passed, the
  idea that clicked. One concrete detail beats three adjectives.
- Include one thing they got wrong and what it taught them, in their own words where given. That's
  what makes it worth reading.
- Small weeks are fine: write a short, honest post about what did happen. Never pad.

Voice: first person, plain and direct, like an engineer talking to other engineers. Confident about
what they did, honest about what they didn't. No hype ("excited to share", "game changer", "journey",
"dive deep"), no emoji, no em dashes, no links. Don't name the tool that set the work.

LinkedIn: 120 to 220 words in short paragraphs. Open with the most interesting concrete thing, not a
greeting. End with what's next, or a genuine question to other engineers. At most two hashtags, on
the last line, only if they're specific (#rustlang yes, #learning no).

X: one post, at most 270 characters, standalone, the single most interesting thing from the week.
No hashtags unless one is genuinely useful.

drewOn: what the posts are based on, a few words each.
`.trim();

export type PostWeek = {
  weekStart: string;
  missions: {
    title: string;
    cadence: "daily" | "weekly";
    stack: string | null;
    status: string;
    outcome: string | null;
    learned: string | null;
    gotWrong: string | null;
  }[];
  dailySets: {
    day: string;
    outcome: string | null;
    score: number | null;
    languages: string[];
    kinds: string[];
  }[];
  notes: { learned: string; gotWrong: string }[];
  skills: { name: string; before: string; after: string }[];
  focus: string | null;
};

export async function draftWeeklyPost(
  week: PostWeek,
  abortSignal?: AbortSignal,
): Promise<{ post: DraftedPost; meta: GenerationMeta }> {
  const prompt = [
    `THE WEEK starting ${week.weekStart}`,
    "",
    "MISSIONS",
    ...(week.missions.length > 0
      ? week.missions.map(
          (m) =>
            `- ${m.cadence === "weekly" ? "Weekly challenge" : "Mission"}: ${m.title}${m.stack ? ` (${m.stack})` : ""}. ` +
            `${m.outcome ? `Evaluated: ${m.outcome}.` : `Status: ${m.status.replace("_", " ")}.`}` +
            `${m.learned ? ` They learned: ${m.learned}` : ""}${m.gotWrong ? ` They got wrong: ${m.gotWrong}` : ""}`,
        )
      : ["- none"]),
    "",
    "DAILY CODING SETS (five questions: write a program, an interview problem, fix a bug, explain code, predict output)",
    ...(week.dailySets.length > 0
      ? week.dailySets.map(
          (d) =>
            `- ${d.day}: ${d.outcome ? `${d.outcome}, ${Math.round((d.score ?? 0) * 100)}%` : "not handed in"}. Languages: ${d.languages.join(", ")}.`,
        )
      : ["- none"]),
    ...(week.notes.length > 0
      ? ["", "THEIR NOTES", ...week.notes.map((n) => `- Learned: ${n.learned} Got wrong: ${n.gotWrong}`)]
      : []),
    "",
    "SKILLS THAT MOVED",
    ...(week.skills.length > 0
      ? week.skills.map((s) => `- ${s.name}: ${s.before} to ${s.after}`)
      : ["- none"]),
    ...(week.focus ? ["", `NEXT: ${week.focus}`] : []),
  ].join("\n");

  const { output, meta } = await generateStructured({
    module: "post-drafter",
    promptVersion: PROMPT_VERSION,
    tier: "smart",
    instructions: SYSTEM_PROMPT,
    prompt,
    schema: draftedPostSchema,
    schemaName: "WeeklyPost",
    schemaDescription: "A week of learning as a LinkedIn post and an X post.",
    maxOutputTokens: 3_000,
    timeoutMs: 90_000,
    abortSignal,
  });
  return { post: output, meta };
}
