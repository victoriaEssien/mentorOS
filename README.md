# mentorOS

An AI technical mentor that runs your learning week by week. Every week has a theme, chosen and ordered by the app. Every day you research one new concept from it and explain it back in writing, and it's graded point by point. Concepts you're shaky on come back, asked a new way, until they stick. Every theme ends with a project you build and hand in.

```text
Theme → Research → Explain → Graded → Return → Build
```

- How the code is laid out, and the learning model: [docs/architecture.md](docs/architecture.md)
- What the mentor does to the learner: [docs/mentor-behaviour.md](docs/mentor-behaviour.md)
- The original product thinking: [docs/prd.md](docs/prd.md) (its assessments, tracks and skill levels were replaced by weekly themes)

> **Status:** MVP. The whole loop runs end to end on a phone: onboarding, 17 themes over 21 weeks, a concept a day graded against a stored checklist with a follow-up question, spaced reviews, a project per theme reviewed against its brief, a draft post for each project, a history of every explanation, daily and weekly emails, and a mentor that knows the learner's record.

## Stack

| Layer           | Choice                                                        |
| --------------- | ------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19, TypeScript                 |
| UI              | Tailwind CSS v4, shadcn/ui                                    |
| Database        | PostgreSQL on Neon, Drizzle ORM                               |
| Auth            | Better Auth (email/password, optional GitHub and Google)      |
| AI              | Vercel AI SDK with OpenAI, behind `src/server/ai/provider.ts` |
| Email           | Resend's HTTP API, plus one daily Vercel Cron job             |
| Validation      | Zod                                                           |
| Monitoring      | Sentry, PostHog (both no-op until keys are set)               |
| Tests           | Vitest                                                        |
| Package manager | pnpm                                                          |

## Getting started

```bash
pnpm install
cp .env.example .env.local        # then fill it in
pnpm db:push                      # create tables on your Neon database
pnpm dev
```

There's nothing to seed. The themes and their concepts live in code (`src/lib/themes.ts`); each concept's checklist and reference explanation are written by the model the first time anyone opens it, then stored.

Minimum `.env.local` to boot: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OPENAI_API_KEY`, `AI_MODEL_FAST`, `AI_MODEL_SMART`, `AI_MODEL_DEEP`.

`pnpm dev` serves on port 3000. To use another port, pass it and point the app's own URLs at it, since `.env.local` names port 3000:

```bash
BETTER_AUTH_URL=http://localhost:3210 NEXT_PUBLIC_APP_URL=http://localhost:3210 pnpm dev -p 3210
```

### Google sign-in

1. In Google Cloud, set up the OAuth consent screen (External). While it's in testing, add yourself as a test user.
2. Create an OAuth client ID of type "Web application". Its authorised redirect URI is your `BETTER_AUTH_URL` plus `/api/auth/callback/google`, for example `http://localhost:3000/api/auth/callback/google`. Add your live domain's too.
3. Put the client ID and secret in `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then restart `pnpm dev`. "Continue with Google" appears on sign-in and sign-up.

### Email

In development, emails print to the `pnpm dev` log, links included, so confirming and resetting work without sending anything. To send for real:

1. In Resend, add and verify your sending domain.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` (for example `mentorOS <no-reply@your-domain>`).
3. Outside production, mail only goes to `EMAIL_DEV_REDIRECT` (`delivered@resend.dev` is Resend's test inbox), never to a learner's address.

The daily email and the Monday progress email go out from `/api/cron/daily`, which Vercel Cron calls at 08:00 UTC (`vercel.json`) with `CRON_SECRET` as a bearer token. Set `CRON_SECRET` in Vercel too. Resend's free plan sends 100 emails a day, so a run stops at 80 and leaves room for account emails. To run it by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3210/api/cron/daily
```

### Live AI calls cost money

Every concept, grade, project and mentor reply is a paid model call on your OpenAI account. Each call has an output cap, so a stuck request can't run up a bill, and each logs one `ai.generation` line with its model and token counts. Unit tests never call a model. Roughly, per call:

| What                                           | Model tier | Cost     |
| ---------------------------------------------- | ---------- | -------- |
| Write a concept (once, shared by all learners) | smart      | ~$0.01   |
| Grade an explanation                           | smart      | ~$0.01   |
| A review question, a follow-up check           | fast       | ~$0.002  |
| Write a theme's project                        | smart      | ~$0.04   |
| Review a hand-in, with its second look         | smart      | ~$0.025  |
| Draft a project post                           | smart      | ~$0.01   |
| A mentor reply, an explanation                 | fast       | < $0.001 |

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

## Project structure

```text
docs/                       PRD, mentor behaviour, architecture
src/
  app/
    (marketing)/            landing page, privacy, terms
    (auth)/                 sign-in, sign-up, password reset
    (app)/(shell)/          tabs with the dock: today, projects, concepts, mentor, profile ("You"),
                            plus settings, pushed from You
    (app)/(focus)/          full-screen flows: onboarding
    api/auth/[...all]/      Better Auth handler
    api/mentor/             streaming mentor chat
    api/cron/daily/         the daily email job
  components/
    shell/                  app frame: dock, side rail, screens, page transitions
    system/                 the app's own pieces: meters, alert and mission cards, rich text
    form/, ui/              form helpers and shadcn components
  db/
    schema/                 Drizzle tables, one file per area
  lib/                      env, auth, the theme curriculum, and pure helpers for server and client
  server/
    ai/                     provider and tiers, learner context, Zod output schemas, AI modules
    email/                  templates, the daily job, sending
    learning/               the loop's orchestrators and deterministic engine (writes state)
    queries/                read-only queries for pages
  proxy.ts                  optimistic auth redirect for app routes
```

## How the loop runs

1. **Onboarding** asks for goals, background and preferences, and shows how the weeks work. The first theme starts that day.
2. **The theme** runs for one or two weeks. When it ends, the next one in the curriculum starts the next time the learner is back, so time away never skips a theme.
3. **Today's session** is one new concept from the theme plus up to three reviews, the most overdue and shakiest first, from any earlier week. The rest roll over to tomorrow.
4. **An explanation** is graded against the concept's stored checklist: each point hit, missed or wrong, then a verdict in code (solid, partly there, not yet), the reference explanation to compare, and one follow-up question with a short check of the answer.
5. **Reviews** are scheduled from the verdict: solid comes back in 3, 7, 14, then 30 days; partly there in a day or two; not yet the next day. Each review asks in a new scenario.
6. **The project** for the theme is written on first visit, due when the theme ends. The hand-in is reviewed against the brief, then a post for X and LinkedIn is drafted.
7. **The mentor** answers from the learner's record: the theme, the project and the concepts they're shaky on.
