# mentorOS

An AI-managed technical apprenticeship. mentorOS assesses what you actually know, finds your gaps, gives you things to learn and build, evaluates what you produce, checks later whether you retained it, and decides what you should tackle next.

```text
Assess → Learn → Practice → Prove → Evaluate → Adapt
```

- Product requirements: [docs/prd.md](docs/prd.md)
- What the mentor does to the learner: [docs/mentor-behaviour.md](docs/mentor-behaviour.md)
- How the code is laid out: [docs/architecture.md](docs/architecture.md)

> **Status:** boilerplate. Infrastructure is wired; product features are stubs that throw `NotImplementedError`.

## Stack

| Layer           | Choice                                                        |
| --------------- | ------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19, TypeScript                 |
| UI              | Tailwind CSS v4, shadcn/ui                                    |
| Database        | PostgreSQL on Neon, Drizzle ORM                               |
| Auth            | Better Auth (email/password, optional GitHub and Google)      |
| AI              | Vercel AI SDK with OpenAI, behind `src/server/ai/provider.ts` |
| Validation      | Zod                                                           |
| Monitoring      | Sentry, PostHog (both no-op until keys are set)               |
| Tests           | Vitest                                                        |
| Package manager | pnpm                                                          |

## Getting started

```bash
pnpm install
cp .env.example .env.local        # then fill it in
pnpm db:push                      # create tables on your Neon database
pnpm db:seed                      # six tracks, their skill trees, prerequisites
pnpm dev
```

Minimum `.env.local` to boot: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OPENAI_API_KEY`, `AI_MODEL_FAST`, `AI_MODEL_SMART`.

### shadcn/ui

`components.json` and the theme tokens are in place, but no components are installed yet. Add them as you need them:

```bash
pnpm dlx shadcn@latest add button card input label textarea badge progress
```

## Scripts

| Script                              | What it does                             |
| ----------------------------------- | ---------------------------------------- |
| `pnpm dev`                          | Dev server on port 3000                  |
| `pnpm build` / `pnpm start`         | Production build and serve               |
| `pnpm lint`                         | ESLint                                   |
| `pnpm typecheck`                    | `tsc --noEmit`                           |
| `pnpm format` / `pnpm format:check` | Prettier                                 |
| `pnpm test`                         | Vitest                                   |
| `pnpm db:generate`                  | Generate a migration from schema changes |
| `pnpm db:migrate`                   | Apply migrations                         |
| `pnpm db:push`                      | Push schema directly (early development) |
| `pnpm db:studio`                    | Drizzle Studio                           |
| `pnpm db:seed`                      | Seed tracks and skills                   |

## Project structure

```text
docs/                       PRD, mentor behaviour, architecture
scripts/seed.ts             taxonomy seed
src/
  app/
    (marketing)/            landing page
    (auth)/                 sign-in, sign-up
    (app)/(shell)/          authenticated tabs with the dock: today, path,
                            missions, mentor, profile ("You"), settings, assessments
    (app)/(focus)/          full-screen flows: onboarding, the assessment player
    api/auth/[...all]/      Better Auth handler
    api/mentor/             mentor chat endpoint (stub)
  components/
    layout/                 app nav, page placeholder
    ui/                     shadcn components go here
  db/
    schema/                 Drizzle tables, one file per area
    seed/                   starter taxonomy data
  lib/                      env, auth, auth client, utils
  server/
    ai/                     provider, learner context, Zod output schemas, AI modules
    learning/               core loop orchestrators and deterministic skill engine
  proxy.ts                  optimistic auth redirect for app routes
```

## Where to start building

The MVP success test (PRD §37) is whether the system gets better at choosing what the learner does next as evidence accumulates. A sensible order:

1. Auth pages and onboarding, writing `learner_profile` and `user_track`
2. `estimateSkill` with unit tests, since everything else depends on it
3. Diagnostic: Assessment Generator → assessment UI → Skill Evaluator → evidence
4. Skill profile page
5. Learning Planner and path page
6. Mission Generator, submission, Submission Evaluator
7. Mentor chat with learner context
8. Surprise checks and weekly challenge
