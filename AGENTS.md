<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working on mentorOS

Conventions for anyone, human or agent, writing code in this repository.

## Read first

- [docs/architecture.md](docs/architecture.md) for the learning model (weekly themes, a concept a day, spaced reviews, a project per theme) and where code goes.
- [docs/mentor-behaviour.md](docs/mentor-behaviour.md) for how the mentor should behave.
- [docs/prd.md](docs/prd.md) for the original product thinking. Its assessments, tracks and skill levels were replaced by weekly themes on 30 October 2026.

## Architecture rules

- **The AI is not the database.** Learner state lives in Postgres. Verdicts and review dates are computed in plain code (`src/server/learning/repetition.ts`) from the grader's point-by-point marks, never taken from model output directly.
- **Write once, keep.** A concept's checklist and reference are written the first time it's opened and stored, so every learner is graded against the same points.
- **Every AI output that changes state is structured.** Define a Zod schema in `src/server/ai/schemas`, generate with `Output.object`, validate, then persist.
- **One responsibility per AI module.** No giant prompt. Add a module under `src/server/ai/modules` rather than growing an existing one.
- **Only `src/server/ai/provider.ts` knows model ids.** Modules ask for a tier (`fast`, `smart` or `deep`).
- **Only `src/server/learning` writes learner state.** Pages and route handlers call orchestrators in `loop.ts`; they never call AI modules directly.
- **Every recommendation carries a reason.** Projects have a required `reason` column. Keep it that way.
- **Bump `PROMPT_VERSION`** in a module whenever its prompt changes, so stored evaluations stay traceable.
- **Server-only code imports `server-only`.** Env reads go through `src/lib/env.ts` (server) or `src/lib/public-env.ts` (client).

## Git

Commit messages are short: a conventional-commit prefix, then a summary. Two lines maximum.

```text
feat: grade explanations against the stored checklist
fix: stop a review coming back twice in one day
docs: describe the review schedule
```

Prefixes in use: `feat:`, `fix:`, `copy:`, `chore:`, `docs:`, `refactor:`, `test:`, `security:`.

No tool attribution: commit messages and pull request descriptions never mention the tool that wrote them.

Agents do not open pull requests. Write the PR title and body as markdown and hand it over.

## Before pushing

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Running the app

`pnpm dev` is the whole stack; the database is hosted on Neon. Never run `pnpm build` while `pnpm dev` is running, since both write to `.next`.

## Package manager

pnpm only. Don't add a `package-lock.json` or `yarn.lock`.
