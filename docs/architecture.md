# Architecture

How the MVP maps to the PRD: where things go, and the rules that hold them together.

## The loop

```text
Assess → Skill profile → Learning plan → Mission → Prove → Evaluate → Update skills → next mission
```

Every feature plugs into that loop (PRD §40). If a feature doesn't feed it or read from it, question whether it belongs in the MVP.

## Layers

```text
src/app                 Routes. Read through queries, write through loop.ts. Never call AI modules directly.
   │
src/server/queries      Read-only queries for pages.
   │
src/server/learning     Orchestrators and deterministic engine. The only code that writes learner state.
   │   loop.ts            every entry point routes use: onboarding, diagnostic, grading, planning,
   │                      missions, hand-ins, checks, settings, the mentor and hints
   │   skill-estimate.ts  ability + confidence from evidence (plain code, testable)
   │   grading.ts         verdicts and scores from rules or a model grade
   │   readiness.ts       prerequisite gate ("not yet")
   │   difficulty.ts      pitches the next mission from recent outcomes
   │   retention.ts       picks skills for surprise checks
   │
src/server/ai           AI service layer (PRD §23, §24)
   │   provider.ts        the only file that knows provider and model ids
   │   context.ts         LearnerContext, assembled from the DB per call
   │   schemas/           Zod contracts for every structured output (PRD §25)
   │   modules/           one responsibility per module, no giant prompt
   │
src/db                  Drizzle schema (Neon Postgres) and seed taxonomy
```

## Principle 7: the AI is not the database

- `skill_evidence` is append-only and is the source of truth for what a learner can do.
- `user_skill` is a derived snapshot, recomputed by `estimateSkill` in plain code. The model never writes it.
- `evaluation.result` stores the validated structured output, plus `model` and `promptVersion`, so any judgement can be traced back.
- AI modules return data. Orchestrators in `src/server/learning` decide what gets persisted.

## AI modules

| Module                | File                       | Tier  | Output                                      |
| --------------------- | -------------------------- | ----- | ------------------------------------------- |
| Assessment Generator  | `assessment-generator.ts`  | deep  | `GeneratedAssessment`                       |
| Skill Evaluator       | `skill-evaluator.ts`       | smart | `ResponseGrade[]`                           |
| Learning Planner      | `learning-planner.ts`      | smart | `LearningPlan`                              |
| Mission Generator     | `mission-generator.ts`     | smart | `GeneratedMission`                          |
| Submission Evaluator  | `submission-evaluator.ts`  | smart | `SubmissionEvaluation`                      |
| Evaluation Checker    | `evaluation-checker.ts`    | smart | `EvaluationCheck` (fixes, usually none)     |
| Skill Profile Updater | `skill-profile-updater.ts` | none  | evidence rows (pure mapping)                |
| Tutor                 | `tutor.ts`                 | fast  | text                                        |
| Mentor                | `mentor.ts`                | fast  | streamed chat, calls other modules as tools |

Tiers map to `AI_MODEL_FAST`, `AI_MODEL_SMART` and `AI_MODEL_DEEP`. Writing assessments gets its own tier because question design decides what the evidence can show: in a side-by-side recheck, the smart-tier model graded, planned and wrote missions as well as the strongest model at a fifth of the price, but wrote weaker questions. Structured generation uses `generateText` with `Output.object({ schema })` from the AI SDK.

### Cost controls

- Every call sets `maxOutputTokens` for its module, so a stuck request is capped. An abandoned request still bills what it generates, so the cap is the only real limit.
- Every call logs one `ai.generation` line: module, model, prompt version, duration, tokens.
- The mentor allows 30 messages per 10 minutes; hints stop at 5 per question.

## Grading

- Multiple choice and "I don't know" are graded by rules. Written answers and hand-ins are graded by the model against a rubric or criteria, and the verdict is computed in code from the scores: strong ≥ 0.85, pass ≥ 0.7, partial ≥ 0.3, otherwise fail (`GRADING_VERSION` g2).
- Hand-in feedback gets a second look before anyone sees it. The Evaluation Checker tests every factual claim in it against the work and the subject, and fixes the ones that don't hold, re-scoring a criterion when a wrong claim changed its marks. The fixes are applied in code and stored with the evaluation (`secondLook`), before and after. If the check fails, the first look stands.
- A grade becomes evidence weighted by difficulty and confidence. Each hint used on a question lowers its confidence (`hintDiscount`).
- A hand-in that passes completes the current path step. A finished path, a graded diagnostic, new tracks or the learner's own request replan it.

## The mentor

- **Chat** streams from `/api/mentor` with tools for explaining, looking up a skill, writing a check, replanning and assigning a mission. Each tool call carries a `why`, shown under the step as it runs. The thread is saved.
- **Hints** stream from `/api/mentor/hint`: the question but never the rubric, no tools, and never any part of what the question asks for.
- Its context (`context.ts`) holds the learner's skills, path, recent missions with their marks per criterion, and recent mistakes. It's rebuilt from the database on every call.

## Work that runs after the response

Slow model work never blocks a screen. It runs in `after()`:

- planning the first path once the diagnostic is graded, then the first mission;
- replanning when tracks change in settings;
- writing a surprise check when Today is opened on a day one is due (at most one in flight per learner).

Today picks the single next action in `src/lib/today.ts`: finish the diagnostic, then a surprise check, then today's mission, then an open check, then new work.

## Data model

| PRD entity                    | Table(s)                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------- |
| User                          | `user`, `session`, `account`, `verification` (Better Auth)                   |
| Track, Skill                  | `track`, `skill` (tree via `parent_id`), `skill_prerequisite`                |
| UserTrack                     | `user_track`                                                                 |
| Onboarding context            | `learner_profile`                                                            |
| SkillEvidence                 | `skill_evidence`                                                             |
| Current estimate              | `user_skill` (derived)                                                       |
| Assessment, AssessmentAttempt | `assessment`, `assessment_item`, `assessment_attempt`, `assessment_response` |
| Quiz, QuizAttempt             | folded into `assessment` via `kind` (`knowledge_check`, `surprise`)          |
| LearningPath                  | `learning_path`, `learning_path_item`                                        |
| Mission, MissionSubmission    | `mission`, `mission_skill`, `mission_submission`                             |
| Evaluation                    | `evaluation`                                                                 |
| MentorConversation            | `mentor_conversation`, `mentor_message`                                      |
| Progress                      | derived from `user_skill` and `skill_evidence`, no table                     |
| Achievement                   | not modelled yet (gamification is out of MVP scope)                          |

## Auth

Better Auth with the Drizzle adapter. Email/password is on; GitHub and Google switch on when their env vars exist.

- Google asks which account to use (`prompt: "select_account"`).
- A Google or GitHub sign-in never attaches itself to an existing email/password account whose address isn't verified (Better Auth's `requireLocalEmailVerified` default). Otherwise anyone could register someone else's address first and inherit their sign-in. The sign-in page tells that person to use their password instead.
- OAuth failures come back to `/sign-in?error=<code>`, and `oauthErrorMessage` turns the code into words.

- `src/proxy.ts` is an optimistic cookie check for app routes (Next 16 renamed `middleware` to `proxy`).
- Pages do the real check with `requireUser()` or `requireLearner()` from `src/server/session.ts`. `requireLearner()` also sends anyone who hasn't finished onboarding to `/onboarding`.
- Server code reads the session with `getSession()` from `src/lib/auth.ts` (memoised per request).

## Rendering

Cache Components is on (`next.config.ts`). Layouts stay static so the app shell (dock, side rail) is part of the instant prerendered shell, and Activity keeps recently visited tabs mounted so their state survives a tab switch.

- Anything that reads the request (session, cookies, `searchParams`, URL segments in client hooks) or uncached data (database queries) must sit behind a `<Suspense>` boundary. Every app route has a `loading.tsx` for this, so pages can `await requireLearner()` at the top.
- Never await request data in a layout.
- Reads for pages live in `src/server/queries`; writes to learner state stay in `src/server/learning`.
- Screens slide in the direction of travel: links into something carry `transitionTypes={NAV_FORWARD}`, back links `NAV_BACK`, and `Screen` wraps each page in the `ViewTransition` that animates them. Tab switches swap instantly.
- The shell and focus groups each have `error.tsx` and `not-found.tsx`, so one failing screen keeps the rest of the app reachable.
- The device's time zone is stored in a cookie on first visit, so greetings and dates use the learner's own clock.

## Not set up yet (on purpose)

- **Background jobs.** `after()` covers the MVP. A queue (the PRD names Inngest) becomes worth it once work has to run without a visit, such as reminders.
- **Code execution / sandboxes.** Post-MVP (PRD §6).
- **Repository analysis.** Hand-ins read the public GitHub files and gists they link to (`artifacts.ts`), but nothing clones, runs or analyses a whole repository. Post-MVP (PRD §36).
