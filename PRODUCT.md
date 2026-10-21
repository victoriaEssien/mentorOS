# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile-first web app that should feel like a native app and install to the home screen (PWA). Native apps are out of scope for the MVP (PRD §6).

## Users

Public from day one: anyone who wants to become technically stronger through practical work, beginner or experienced. Examples from the PRD: aspiring and working software engineers, people learning cybersecurity, data analysts, people exploring electronics and robotics, product and UI/UX practitioners, self-taught learners.

They arrive as strangers, so the landing page and onboarding have to earn trust and sign-ups on their own.

## Product Purpose

An AI-managed technical apprenticeship. It assesses what a learner can actually do, finds the gaps, gives them concrete things to build, evaluates what they produce, checks later whether they retained it, and decides what they should tackle next.

Success: the system gets noticeably better at choosing the learner's next step as evidence accumulates (PRD §37). Progress means demonstrated capability, not content completed.

## Positioning

Not "AI teaches me programming" but "AI manages my technical apprenticeship". Courses hand everyone the same sequence; mentorOS tests you first, keeps an auditable evidence record behind every skill estimate, assigns missions instead of lessons, surprise-tests retention weeks later, explains why it assigns each thing, and is willing to say "not yet".

## Operating Context

- **Phone to check in.** Today's mission, quick knowledge checks, surprise checks, reading evaluations, the skill profile, and chatting with the mentor all happen on the phone, in short sessions.
- **Laptop to build.** Missions like "build a REST API" or "design a schema" are done on a computer. Work comes back as links (repos, gists, deployed URLs) or written explanations, so submission must also work well on a desktop browser.
- The mentor is a coach in the pocket; the work happens elsewhere.

## Capabilities and Constraints

- Core loop: assess → skill profile → learning plan → mission → prove → evaluate → update skills → next mission (PRD §40).
- MVP scope is PRD §35; exclusions are PRD §6 (no social, leaderboards, native apps, voice, certificates, code-execution sandbox, complex gamification).
- Tracks: Software Engineering, Cybersecurity, Data Analysis & Analytics, Electronics & Physical Engineering, UI/UX & Product, Computer Science Foundations. Learners can pick several.
- Every skill shows ability and confidence separately (PRD §28). Every recommendation carries a reason.
- AI calls take seconds to tens of seconds; generation and evaluation need honest waiting states.
- Terminology: mission, weekly challenge, knowledge check, surprise check, skill evidence, learning path, "not yet".

## Brand Commitments

- Name: **mentorOS** (lowercase "mentor", uppercase "OS").
- Mark: a staircase of cells (1 + 2 + 3 + 4) on a signal-yellow tile, the top cell hollow: the next one to earn. Never plain bars, at any size; bars read as a network icon.
- Mascot: **Pip**, that hollow cell come alive (`src/components/brand/pip.tsx`). Pip appears where the mentor speaks (why a mission was chosen, a verdict, the chat), at most once per screen, and its mood follows what the app is doing: waiting, thinking, pass, not yet, a surprise check, asleep. Never decoration, and never a softer verdict than the evidence gives.
- Voice adapts; standards don't. The default is a direct, fair coach: honest, specific, no empty praise, explains why. Each learner can choose how the mentor talks to them (more direct or more encouraging), and the system shifts delivery with performance, steadier support after repeated struggle and more push when someone is coasting. Scores, verdicts and "not yet" decisions never soften to match the tone.

## Evidence on Hand

None yet. No users, testimonials, metrics, case studies or press. Future work must not invent any of them.

## Product Principles

1. Evidence over self-reporting: background informs, assessment decides.
2. Missions over lessons: give the learner something to do, with a reason.
3. Small next steps: one clear action at a time, never an overwhelming plan.
4. The AI is not the database: the stored evidence is the truth; the model only recommends.
5. Tone adapts, standards don't.
