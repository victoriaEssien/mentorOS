# mentorOS

An AI-managed technical apprenticeship. mentorOS assesses what you actually know, finds your gaps, gives you things to learn and build, evaluates what you produce, checks later whether you retained it, and decides what you should tackle next.

```text
Assess → Learn → Practice → Prove → Evaluate → Adapt
```

- Product requirements: [docs/prd.md](docs/prd.md)
- What the mentor does to the learner: [docs/mentor-behaviour.md](docs/mentor-behaviour.md)
- How the code is laid out: [docs/architecture.md](docs/architecture.md)

> **Status:** MVP. The whole loop runs end to end on a phone: onboarding, a written diagnostic, graded evidence, a planned path, daily missions and weekly challenges, hand-ins evaluated against criteria, knowledge and surprise checks, and a mentor that knows the learner's record.

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

Minimum `.env.local` to boot: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OPENAI_API_KEY`, `AI_MODEL_FAST`, `AI_MODEL_SMART`, `AI_MODEL_DEEP`.

`pnpm dev` serves on port 3000. To use another port, pass it and point the app's own URLs at it, since `.env.local` names port 3000:

```bash
BETTER_AUTH_URL=http://localhost:3210 NEXT_PUBLIC_APP_URL=http://localhost:3210 pnpm dev -p 3210
```

### Live AI calls cost money

Every assessment, grade, plan, mission and mentor reply is a paid model call on your OpenAI account. Each call has an output cap, so a stuck request can't run up a bill, and each logs one `ai.generation` line with its model and token counts. Unit tests never call a model. Roughly, per call:

| What                                   | Model tier | Cost     |
| -------------------------------------- | ---------- | -------- |
| Write a diagnostic (three calls)       | deep       | ~$0.25   |
| Write a knowledge or surprise check    | deep       | ~$0.05   |
| Grade one written answer               | smart      | ~$0.005  |
| Grade a hand-in, with its second look  | smart      | ~$0.025  |
| Plan a path, write a mission           | smart      | ~$0.02   |
| A mentor reply, a hint, an explanation | fast       | < $0.001 |

## Scripts

| Script                              | What it does                             |
| ----------------------------------- | ---------------------------------------- |
| `pnpm dev`                          | Dev server on port 3000                  |
| `pnpm build` / `pnpm start`         | Production build and serve               |
| `pnpm lint`                         | ESLint                                   |
| `pnpm typecheck`                    | Route types, then `tsc --noEmit`         |
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
    (app)/(shell)/          tabs with the dock: today, path, missions, mentor, profile ("You"),
                            plus settings and assessments, pushed from You
    (app)/(focus)/          full-screen flows: onboarding, the assessment player and results
    api/auth/[...all]/      Better Auth handler
    api/mentor/             streaming mentor chat, and hint-only help inside assessments
  components/
    shell/                  app frame: dock, side rail, screens, page transitions
    system/                 the app's own pieces: skill meters, journal, alert and mission cards
    form/, ui/              form helpers and shadcn components
  db/
    schema/                 Drizzle tables, one file per area
    seed/                   starter taxonomy data
  lib/                      env, auth, and pure helpers shared by server and client
  server/
    ai/                     provider and tiers, learner context, Zod output schemas, AI modules
    learning/               the loop's orchestrators and deterministic engine (writes state)
    queries/                read-only queries for pages
  proxy.ts                  optimistic auth redirect for app routes
```

## How the loop runs

1. **Onboarding** asks for tracks, goals, background and preferences, then writes a diagnostic.
2. **The diagnostic** is graded: multiple choice by rules, written answers by the model against a rubric. Each answer becomes evidence, and skill estimates are recomputed from all of it in plain code.
3. **The path** is planned from that evidence, with a reason for every step and prerequisites enforced in code.
4. **Missions** are written for the current step, pitched by recent outcomes. Hand-ins are evaluated per criterion, become evidence, and move the path on when they pass.
5. **Checks** keep estimates honest: knowledge checks on request, surprise checks on skills not practised for a while.
6. **Today** shows the one thing to do next. **The mentor** answers from the learner's record and can explain, test, replan and hand out work.
