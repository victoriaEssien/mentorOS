# Architecture

Where things go, and the rules that hold them together. The learning model changed on 30 October 2026: assessments, tracks, skill levels and the daily five gave way to weekly themes. The PRD still describes the old model; this file describes the code.

## The loop

```text
Theme → Research → Explain → Graded → Return → Build
```

- **Themes** are chosen and ordered by the app (`src/lib/themes.ts`): 17 themes over 21 weeks, backend and frontend, each building on the last. A theme lasts one week, or two when the project is bigger. After the last theme the curriculum wraps round.
- **A concept a day.** Each theme lists its concepts in order, seven a week. Today's new concept is the theme's first one the learner hasn't been given yet.
- **Explain, then graded.** The learner researches however they like and writes an explanation. It's graded against the concept's stored checklist, strictly: the right terms without the mechanism don't count.
- **Return.** Each concept gets a review date from its verdict. A day's session is one new concept plus up to three reviews.
- **Build.** Each theme has one project, due when the theme ends. The hand-in is reviewed against the brief, then a post is drafted.

There are no levels, percentages, tracks, assessments, gates or surprise tests. Data structures and algorithms are out of scope.

## Layers

```text
src/app                 Routes. Read through queries, write through loop.ts. Never call AI modules directly.
   │
src/server/queries      Read-only queries for pages.
   │
src/server/learning     Orchestrators and deterministic engine. The only code that writes learner state.
   │   loop.ts            every entry point routes use: onboarding, themes, the session, explaining,
   │                      follow-ups, projects, hand-ins, posts, settings, the mentor
   │   themes.ts          starts the next theme run when none covers today
   │   concepts.ts        builds the day's session, writes concepts, grades and reschedules
   │   repetition.ts      verdicts, review dates and which reviews come up (plain code, testable)
   │   missions.ts        the theme's project
   │   mission-stack.ts   which stack a project uses
   │   difficulty.ts      pitches the next project from recent outcomes
   │   submissions.ts     hand-ins and their review
   │   project-post.ts    the post drafted from a reviewed project
   │
src/server/ai           AI service layer (PRD §23, §24)
   │   provider.ts        the only file that knows provider and model ids
   │   context.ts         LearnerContext, assembled from the DB per call
   │   schemas/           Zod contracts for every structured output (PRD §25)
   │   modules/           one responsibility per module, no giant prompt
   │
src/db                  Drizzle schema (Neon Postgres)
```

## The AI is not the database

- The grader marks each checklist point hit, missed or wrong. The verdict is computed from those marks in code (`verdictFor` in `repetition.ts`): solid when every point is hit and none is wrong; otherwise partly there from half the points hit (three quarters if anything is wrong), else not yet.
- Review dates come from `nextSchedule`, in code: solid steps up a ladder of 3, 7, 14, then 30 days; partly there comes back in 2 days (1 if the last verdict was not yet); not yet comes back the next day.
- A concept's checklist and reference explanation are written once, the first time anyone opens it, and stored in `concept`. Everyone is graded against the same points, and a grade can always be checked against them.
- Every model output that changes state is stored with its model and prompt version (`gradedBy`, `generatedBy`, `evaluation.promptVersion`).
- AI modules return data. Orchestrators in `src/server/learning` decide what gets persisted.

## The day's session

`ensureSession` builds it the first time Today is opened that day, under a per-day lock, with no model call:

- the new concept, if the theme has one left;
- reviews from `pickReviews`: due concepts ranked by days overdue plus shakiness (never explained 3, not yet 2, partly there 1, solid 0), capped at three. The rest roll over, and Today says how many.

Attempts reference concepts by slug, with no foreign key, so Today never waits on the model. The concept page writes what it needs on first open: the concept itself (smart tier, about fifteen seconds), or for a review, a fresh scenario that asks about it a new way (fast tier). Themes where a wrong lesson is costly (auth, client-side security, payments) carry official docs (OWASP, Stripe), shown beside the reference explanation.

## AI modules

| Module               | File                      | Tier  | Output                                        |
| -------------------- | ------------------------- | ----- | --------------------------------------------- |
| Concept Writer       | `concept-writer.ts`       | smart | the ask, checklist, reference and sources     |
| Concept Grader       | `concept-grader.ts`       | smart | point-by-point marks, feedback, a follow-up   |
|                      |                           | fast  | a review question; a follow-up answer's check |
| Project Writer       | `mission-generator.ts`    | smart | `GeneratedMission`                            |
| Submission Evaluator | `submission-evaluator.ts` | smart | `SubmissionEvaluation`                        |
| Evaluation Checker   | `evaluation-checker.ts`   | smart | `EvaluationCheck` (fixes, usually none)       |
| Post Drafter         | `post-drafter.ts`         | smart | a LinkedIn post and an X post                 |
| Tutor                | `tutor.ts`                | fast  | text                                          |
| Mentor               | `mentor.ts`               | fast  | streamed chat, calls the tutor as a tool      |

Tiers map to `AI_MODEL_FAST`, `AI_MODEL_SMART` and `AI_MODEL_DEEP`. Nothing uses the deep tier right now. Structured generation uses `generateText` with `Output.object({ schema })` from the AI SDK.

### Cost controls

- Every call sets `maxOutputTokens` for its module, so a stuck request is capped. An abandoned request still bills what it generates, so the cap is the only real limit.
- Every call logs one `ai.generation` line: module, model, prompt version, duration, tokens.
- Concepts are written once and shared, so a concept costs one call however many learners open it.
- Locks in the `throttle` table stop double clicks and retries from paying twice: one concept write at a time per concept, one project write per theme run, four post drafts per project.
- The mentor allows 30 messages per 10 minutes.

## Projects

- One project per theme run, written the first time the theme's project is asked for, due when the theme ends. Its stack comes from `planStack` and its difficulty from `planDifficulty`. Two in three projects use the learner's own technologies. Every third explores something they don't already use, from the theme's side of the stack: frameworks such as Vue, Svelte, Angular, Solid, Astro or htmx for frontend themes; services and languages such as Go, Redis, Kafka or Rust for backend ones; both, alternating, for full-stack themes.
- Projects vary in form: web app, backend service, CLI tool, library, browser extension or mobile app. Each theme lists the forms that suit it, best fit first, and `planForm` (`project-form.ts`) takes the first one the learner hasn't built in their last two projects. One pass of the curriculum builds all six. The form is stored on the project (`mission.form`), and the Project Writer is told what done means for it.
- Hand-ins are reviewed per criterion against the brief. The verdict is computed in code from the scores: strong ≥ 0.85, pass ≥ 0.7, partial ≥ 0.3, otherwise fail (`GRADING_VERSION` g4).
- Feedback gets a second look before anyone sees it. The Evaluation Checker tests every factual claim in it against the work and the subject, and fixes the ones that don't hold. The fixes are applied in code and stored with the evaluation (`secondLook`), before and after. If the check fails, the first look stands.
- Once a hand-in is reviewed, a post for X and LinkedIn is drafted in `after()`, from what was built, what was hard and what went wrong. The learner can redraft it.

## Starting over

Settings has a Start over row. After a confirmation, `resetLearning` (`start-over.ts`) deletes the learner's concept attempts, review schedule, theme runs, projects (with their hand-ins, reviews and posts) and mentor threads in one batch, and clears `onboarding_completed_at`, so they go back through onboarding with their answers filled in. The account, sign-in, email settings and the shared `concept` rows stay.

## The mentor

- **Chat** streams from `/api/mentor` with one tool, a longer explanation from the tutor. The tool call carries a `why`, shown under the step as it runs. The thread is saved.
- Its context (`context.ts`) holds the learner's goals and background, the current theme and project, recent projects with their outcomes, recent concepts with their verdicts, and recent mistakes. It's rebuilt from the database on every call.

## Emails

Everything lives in `src/server/email`. Templates are plain code (no model calls), rendered by `layout.ts` into table HTML and a text version, and sent by `send.ts` through Resend's HTTP API. Outside production nothing reaches a learner: mail goes to `EMAIL_DEV_REDIRECT` or prints to the log.

- **Account emails** (`account-emails.ts`): confirm your email (on email sign-up), reset your password, and "your password was changed". Better Auth's callbacks send them in `after()`, so a reset request takes the same time whether or not the address has an account. They can't be turned off.
- **Link caps.** Confirm and reset links are capped at three an hour per account in the `throttle` table (`src/server/throttle.ts`). Better Auth's rate limiter only covers its own HTTP routes, not calls from server actions, so this is the cap that holds. Password changes in Settings get five tries per 15 minutes the same way.
- **The daily and weekly emails** (`engagement-emails.ts`, `daily.ts`): `/api/cron/daily` runs once a day from Vercel Cron. The daily email names today's new concept and the reviews due, says how yesterday's explanations went (or how long it's been), and the project's days left. It's worked out without building the session, so it never starts anything. On Mondays, anyone who explained a concept or handed in a project that week gets the weekly email instead: the week's concepts with their verdicts, where the project stands, and the theme. Only confirmed addresses, one of these emails per person per day, and at most 80 a run (Resend's free plan sends 100 a day). Each send is claimed in `email_settings` first, and Resend's idempotency key backs that up, so a retried run can't send twice.
- **Unsubscribe.** Each optional email carries a signed, per-topic link (`src/lib/unsubscribe-token.ts`). People get a page with a button (a mail scanner opening the link can't unsubscribe anyone), and mail apps get the one-click `List-Unsubscribe` POST (RFC 8058) at `/api/email/unsubscribe`. Settings has the same two switches.

## Data model

| What                          | Table(s)                                                   |
| ----------------------------- | ---------------------------------------------------------- |
| User                          | `user`, `session`, `account`, `verification` (Better Auth) |
| Onboarding context            | `learner_profile`                                          |
| A theme's run for a learner   | `theme_run` (start, end, its project)                      |
| A concept, written once       | `concept` (checklist, reference, sources)                  |
| Each time a concept is asked  | `concept_attempt` (question, explanation, marks, verdict)  |
| When a concept comes back     | `concept_schedule`                                         |
| Project, hand-in              | `mission`, `mission_submission`                            |
| Hand-in review                | `evaluation`                                               |
| A project's post              | `project_post`                                             |
| MentorConversation            | `mentor_conversation`, `mentor_message`                    |
| Email choices                 | `email_settings`                                           |
| Rate limits and locks         | `throttle`                                                 |

The history of every concept is `concept_attempt`, newest first, with the explanation, verdict and feedback.

## Auth

Better Auth with the Drizzle adapter. Email/password is on; GitHub and Google switch on when their env vars exist.

- Google asks which account to use (`prompt: "select_account"`).
- A Google or GitHub sign-in never attaches itself to an existing email/password account whose address isn't verified (Better Auth's `requireLocalEmailVerified` default). Otherwise anyone could register someone else's address first and inherit their sign-in. The sign-in page tells that person to use their password instead.
- OAuth failures come back to `/sign-in?error=<code>`, and `oauthErrorMessage` turns the code into words.
- Email sign-ups get a confirm link. Nothing waits on it, but the daily and weekly emails only go to confirmed addresses, and Today shows a reminder until it's done.
- Forgot password: `/forgot-password` sends a link (good for an hour, once) to `/reset-password`. A reset signs out every other device, and so does a change in Settings.

- `src/proxy.ts` is an optimistic cookie check for app routes (Next 16 renamed `middleware` to `proxy`).
- Pages do the real check with `requireUser()` or `requireLearner()` from `src/server/session.ts`. `requireLearner()` also sends anyone who hasn't finished onboarding to `/onboarding`.
- Server code reads the session with `getSession()` from `src/lib/auth.ts` (memoised per request).
- Old links (`/missions`, `/path`, `/assessments`, skill pages) redirect in `next.config.ts`.

## Rendering

Cache Components is on (`next.config.ts`). Layouts stay static so the app shell (dock, side rail) is part of the instant prerendered shell, and Activity keeps recently visited tabs mounted so their state survives a tab switch.

- Anything that reads the request (session, cookies, `searchParams`, URL segments in client hooks) or uncached data (database queries) must sit behind a `<Suspense>` boundary. Every app route has a `loading.tsx` for this, so pages can `await requireLearner()` at the top.
- Never await request data in a layout.
- Reads for pages live in `src/server/queries`; writes to learner state stay in `src/server/learning`.
- Screens slide in the direction of travel: links into something carry `transitionTypes={NAV_FORWARD}`, back links `NAV_BACK`, and `Screen` wraps each page in the `ViewTransition` that animates them. Tab switches swap instantly.
- The shell and focus groups each have `error.tsx` and `not-found.tsx`, so one failing screen keeps the rest of the app reachable.
- The device's time zone is stored in a cookie on first visit, so the day, greetings and dates use the learner's own clock.

## Not set up yet (on purpose)

- **Background jobs.** `after()` and one daily Vercel Cron job (emails) cover the MVP. A queue becomes worth it when work needs retries or has to run more often than daily.
- **Repository analysis.** Hand-ins read the public GitHub files and gists they link to (`artifacts.ts`), but nothing clones, runs or analyses a whole repository.
