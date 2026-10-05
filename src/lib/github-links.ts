/**
 * Recognising GitHub links in a mission submission, and choosing which files of a repository are
 * worth showing the evaluator. Pure: the fetching lives in src/server/learning/artifacts.ts.
 */

export type GithubLink =
  | { kind: "gist"; id: string }
  | { kind: "repo"; owner: string; repo: string; ref: string | null; path: string | null };

const NAME = /^[A-Za-z0-9_.-]{1,100}$/;

export function parseGithubLink(raw: string): GithubLink | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);

  if (url.hostname === "gist.github.com") {
    const id = parts.at(-1);
    return id && /^[0-9a-f]{5,64}$/i.test(id) ? { kind: "gist", id } : null;
  }

  if (url.hostname === "github.com" || url.hostname === "www.github.com") {
    const [owner, rawRepo, mode, ref, ...rest] = parts;
    const repo = rawRepo?.replace(/\.git$/, "");
    if (!owner || !repo || !NAME.test(owner) || !NAME.test(repo)) return null;
    if ((mode === "tree" || mode === "blob") && ref) {
      return { kind: "repo", owner, repo, ref, path: rest.length > 0 ? rest.join("/") : null };
    }
    return { kind: "repo", owner, repo, ref: null, path: null };
  }

  return null;
}

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "vendor",
  "target",
  ".git",
  ".next",
  "__pycache__",
  ".venv",
  "venv",
  "coverage",
]);

const LOCKFILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "poetry.lock",
  "cargo.lock",
  "composer.lock",
  "gemfile.lock",
  "bun.lockb",
]);

/** Lower is shown first. Code and queries matter most, then prose, then configuration. */
const EXTENSION_RANK: Record<string, number> = {
  sql: 1,
  py: 1,
  js: 1,
  jsx: 1,
  ts: 1,
  tsx: 1,
  mjs: 1,
  cjs: 1,
  go: 1,
  rs: 1,
  java: 1,
  kt: 1,
  rb: 1,
  php: 1,
  cs: 1,
  c: 1,
  h: 1,
  cpp: 1,
  hpp: 1,
  swift: 1,
  ino: 1,
  r: 1,
  sh: 2,
  html: 2,
  css: 2,
  scss: 2,
  md: 3,
  txt: 3,
  json: 4,
  yml: 4,
  yaml: 4,
  toml: 4,
};

const NAMED_FILES: Record<string, number> = { dockerfile: 2, makefile: 2 };

function rankOf(path: string): number | null {
  const name = path.split("/").at(-1)!.toLowerCase();
  if (LOCKFILES.has(name) || name.endsWith(".min.js") || name.endsWith(".map")) return null;
  if (path.split("/").some((segment) => SKIP_DIRS.has(segment.toLowerCase()))) return null;
  if (name in NAMED_FILES) return NAMED_FILES[name];
  if (/^readme(\.(md|markdown|txt|rst))?$/.test(name)) return 3;
  const extension = name.includes(".") ? name.split(".").at(-1)! : "";
  return EXTENSION_RANK[extension] ?? null;
}

export type TreeEntry = { path: string; type: string; size?: number };

/**
 * The files to read from a repository tree: the root README first, then source code, shallow
 * before deep, skipping dependencies, build output, lockfiles and anything large.
 */
export function pickRepoFiles(
  tree: readonly TreeEntry[],
  { max, under = null, maxBytes = 60_000 }: { max: number; under?: string | null; maxBytes?: number },
): string[] {
  const scope = under?.replace(/\/+$/, "") ?? null;

  return tree
    .filter((entry) => entry.type === "blob" && (entry.size ?? 0) <= maxBytes)
    .filter((entry) => !scope || entry.path === scope || entry.path.startsWith(`${scope}/`))
    .flatMap((entry) => {
      const rank = rankOf(entry.path);
      if (rank === null) return [];
      const isRootReadme = /^readme(\.[a-z]+)?$/i.test(entry.path);
      return [{ path: entry.path, rank: isRootReadme ? 0 : rank, depth: entry.path.split("/").length }];
    })
    .sort((a, b) => a.rank - b.rank || a.depth - b.depth || a.path.length - b.path.length)
    .slice(0, max)
    .map((entry) => entry.path);
}
