# Architecture

How the boilerplate maps to the PRD. This describes where things go, not how they work yet; nearly everything below is a stub.

## The loop

```text
Assess → Skill profile → Learning plan → Mission → Prove → Evaluate → Update skills → next mission
```

Every feature plugs into that loop (PRD §40). If a feature doesn't feed it or read from it, question whether it belongs in the MVP.

## Layers

```text
src/app                 Routes. Read data, call server actions. Never call AI modules directly.
   │
src/server/learning     Orchestrators and deterministic engine. The only code that writes learner state.
   │   loop.ts            completeOnboarding, submitAssessmentAttempt, refreshLearningPath,
   │                      assignNextMission, submitMission
   │   skill-estimate.ts  ability + confidence from evidence (plain code, testable)
   │   readiness.ts       prerequisite gate ("not yet")
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
| Skill Profile Updater | `skill-profile-updater.ts` | none  | evidence rows (pure mapping)                |
| Tutor                 | `tutor.ts`                 | fast  | text                                        |
| Mentor                | `mentor.ts`                | fast  | streamed chat, calls other modules as tools |

Tiers map to `AI_MODEL_FAST`, `AI_MODEL_SMART` and `AI_MODEL_DEEP`. Writing assessments gets its own tier because question design decides what the evidence can show: in a side-by-side recheck, the smart-tier model graded, planned and wrote missions as well as the strongest model at a fifth of the price, but wrote weaker questions. Structured generation uses `generateText` with `Output.object({ schema })` from the AI SDK.

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

- `src/proxy.ts` is an optimistic cookie check for app routes (Next 16 renamed `middleware` to `proxy`).
- Pages do the real check with `requireUser()` or `requireLearner()` from `src/server/session.ts`. `requireLearner()` also sends anyone who hasn't finished onboarding to `/onboarding`.
- Server code reads the session with `getSession()` from `src/lib/auth.ts` (memoised per request).

## Rendering

Cache Components is on (`next.config.ts`). Layouts stay static so the app shell (dock, side rail) is part of the instant prerendered shell, and Activity keeps recently visited tabs mounted so their state survives a tab switch.

- Anything that reads the request (session, cookies, `searchParams`, URL segments in client hooks) or uncached data (database queries) must sit behind a `<Suspense>` boundary. Every app route has a `loading.tsx` for this, so pages can `await requireLearner()` at the top.
- Never await request data in a layout.
- Reads for pages live in `src/server/queries`; writes to learner state stay in `src/server/learning`.

## Not set up yet (on purpose)

- **Background jobs.** The PRD lists Inngest "when needed". Surprise checks and daily mission assignment will likely need it; add it then.
- **Code execution / sandboxes.** Post-MVP (PRD §6).
- **GitHub repo analysis.** Post-MVP (PRD §36).
