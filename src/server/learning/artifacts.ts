import "server-only";

import { env } from "@/lib/env";
import { parseGithubLink, pickRepoFiles, type GithubLink, type TreeEntry } from "@/lib/github-links";

/**
 * Reads what a mission submission links to, so the Submission Evaluator judges the work itself
 * rather than a description of it. Only public GitHub repositories and gists are opened, and
 * only through GitHub's own hosts: a submitted link never decides where the server connects.
 * Anything else is recorded with a note, and the evaluator is told it couldn't see it.
 */

export type ReadArtifact = {
  url: string;
  files: { path: string; content: string }[];
  /** Why nothing (or not everything) could be read, for the evaluator and the learner. */
  note: string | null;
};

const LIMITS = { files: 10, fileChars: 12_000, totalChars: 60_000, timeoutMs: 8_000 };

export async function readArtifacts(urls: readonly string[]): Promise<ReadArtifact[]> {
  let budget = LIMITS.totalChars;
  const artifacts: ReadArtifact[] = [];

  for (const url of urls) {
    const link = parseGithubLink(url);
    if (!link) {
      artifacts.push({
        url,
        files: [],
        note: "Not opened: only public GitHub repositories and gists can be read.",
      });
      continue;
    }
    try {
      const files = link.kind === "gist" ? await readGist(link.id) : await readRepo(link);
      const kept = clip(files, budget);
      budget -= kept.reduce((total, file) => total + file.content.length, 0);
      artifacts.push({
        url,
        files: kept,
        note: kept.length === 0 ? "Opened, but it had no readable text files." : null,
      });
    } catch (error) {
      console.warn(JSON.stringify({ event: "artifact.read_failed", url, reason: String(error) }));
      artifacts.push({
        url,
        files: [],
        note: "Couldn't be read: it may be private, or GitHub didn't answer in time.",
      });
    }
  }

  return artifacts;
}

/** Keeps files within the remaining budget, cutting the last one rather than dropping it. */
function clip(files: { path: string; content: string }[], budget: number) {
  const kept: { path: string; content: string }[] = [];
  for (const file of files) {
    if (budget <= 0) break;
    const limit = Math.min(LIMITS.fileChars, budget);
    const content =
      file.content.length > limit
        ? `${file.content.slice(0, limit)}\n[cut: the file continues]`
        : file.content;
    kept.push({ path: file.path, content });
    budget -= content.length;
  }
  return kept;
}

async function github<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "mentorOS",
      ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(LIMITS.timeoutMs),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub ${response.status} for ${path}`);
  return response.json() as Promise<T>;
}

async function text(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "mentorOS" },
    signal: AbortSignal.timeout(LIMITS.timeoutMs),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response.text();
}

type GistFile = { filename: string; content?: string; truncated?: boolean; raw_url?: string; size?: number };

async function readGist(id: string) {
  const gist = await github<{ files: Record<string, GistFile> }>(`/gists/${encodeURIComponent(id)}`);
  const chosen = pickRepoFiles(
    Object.values(gist.files).map((file) => ({ path: file.filename, type: "blob", size: file.size })),
    { max: LIMITS.files },
  );

  return Promise.all(
    chosen.map(async (name) => {
      const file = gist.files[name];
      // Large gist files come back truncated; their raw copy lives on GitHub's own content host.
      const raw = file.truncated && file.raw_url?.startsWith("https://gist.githubusercontent.com/");
      return { path: name, content: raw ? await text(file.raw_url!) : (file.content ?? "") };
    }),
  );
}

async function readRepo(link: Extract<GithubLink, { kind: "repo" }>) {
  const base = `/repos/${encodeURIComponent(link.owner)}/${encodeURIComponent(link.repo)}`;
  const ref = link.ref ?? (await github<{ default_branch: string }>(base)).default_branch;
  const { tree } = await github<{ tree: TreeEntry[] }>(
    `${base}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
  );
  const chosen = pickRepoFiles(tree, { max: LIMITS.files, under: link.path });

  const raw = (path: string) =>
    `https://raw.githubusercontent.com/${encodeURIComponent(link.owner)}/${encodeURIComponent(link.repo)}/${encodeURIComponent(ref)}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;

  const files = await Promise.allSettled(
    chosen.map(async (path) => ({ path, content: await text(raw(path)) })),
  );
  return files.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}
