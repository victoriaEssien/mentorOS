# AI Technical Mentor / AI Teacher: Product Requirements Document

| Field | Value |
|---|---|
| **Status** | Draft |
| **Version** | 1.0 |
| **Product Type** | AI-powered adaptive technical learning platform |
| **Primary Goal** | Help users become technically stronger through personalized assessment, practice, projects, and continuous evaluation. |

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem](#2-problem)
3. [Target Users](#3-target-users)
4. [Learning Tracks](#4-learning-tracks)
5. [Product Goals](#5-product-goals)
6. [Non-Goals for MVP](#6-non-goals-for-mvp)
7. [Core User Experience](#7-core-user-experience)
8. [Onboarding](#8-onboarding)
9. [Diagnostic Assessment](#9-diagnostic-assessment)
10. [Initial Skill Profile](#10-initial-skill-profile)
11. [Skill System](#11-skill-system)
12. [Personalized Learning Path](#12-personalized-learning-path)
13. [Daily Missions](#13-daily-missions)
14. [Mission Types](#14-mission-types)
15. [Evidence-Based Learning](#15-evidence-based-learning)
16. [Submission Evaluation](#16-submission-evaluation)
17. [Adaptive Learning](#17-adaptive-learning)
18. [Surprise Assessments](#18-surprise-assessments)
19. [Weekly Challenge](#19-weekly-challenge)
20. [Reflection](#20-reflection)
21. [AI Mentor](#21-ai-mentor)
22. [Mentor Behavior](#22-mentor-behavior)
23. [AI Architecture](#23-ai-architecture)
24. [AI Model Architecture](#24-ai-model-architecture)
25. [Structured AI Output](#25-structured-ai-output)
26. [Dashboard](#26-dashboard)
27. [Progress Tracking](#27-progress-tracking)
28. [Skill Confidence](#28-skill-confidence)
29. [Resource Recommendations](#29-resource-recommendations)
30. [Electronics & Physical Engineering Track](#30-electronics--physical-engineering-track)
31. [Future Physical Mentor](#31-future-physical-mentor)
32. [Core Data Model](#32-core-data-model)
33. [SkillEvidence](#33-skillevidence)
34. [Recommended Tech Stack](#34-recommended-tech-stack)
35. [MVP Features](#35-mvp-features)
36. [Post-MVP Features](#36-post-mvp-features)
37. [MVP Success Criteria](#37-mvp-success-criteria)
38. [North Star](#38-north-star)
39. [Product Principles](#39-product-principles)
40. [The Core Product](#40-the-core-product)

---

## 1. Product Overview

The AI Technical Mentor is an adaptive learning platform that acts more like a personal technical apprenticeship system than a traditional course platform.

Instead of giving every learner the same curriculum, the system first determines what the learner actually knows, identifies gaps, and continuously decides what they should learn and practice next.

The core loop is:

```
Assess → Learn → Practice → Prove → Evaluate → Adapt
```

The AI mentor is not simply a chatbot. The chat interface is one part of the product. The core product is the adaptive assessment and learning system behind it.

---

## 2. Problem

Most online technical learning platforms have a fixed structure:

```
Course → Lesson → Quiz → Next Lesson
```

This creates several problems:

- Beginners may be given material they already understand.
- Learners can complete courses without actually being able to apply the knowledge.
- There is often little assessment of practical ability.
- Learning paths are not sufficiently personalized.
- Users don't always know what they should learn next.
- There is little connection between theory, practice, projects, and real-world problem solving.
- Progress is often measured by completion rather than demonstrated ability.

The product should instead answer:

> "Given what I know, what I don't know, and what I want to become capable of doing, what should I do next?"

---

## 3. Target Users

### Primary User

A person who wants to develop technical skills through structured, practical learning.

**Examples:**

- Aspiring software engineers
- Existing developers trying to become stronger engineers
- People learning cybersecurity
- Data analysts
- People exploring electronics and robotics
- Product/UI/UX practitioners who want stronger technical understanding
- Self-taught technical learners

The system should work for both beginners and experienced users.

---

## 4. Learning Tracks

The initial platform should support multiple technical disciplines.

### MVP Tracks

- Software Engineering
- Cybersecurity
- Data Analysis & Analytics
- Electronics & Physical Engineering
- UI/UX & Product
- Computer Science Foundations

Users can select one or multiple tracks.

The system should allow cross-track learning. For example:

```
Software Engineering + Cybersecurity
```

could eventually result in missions around building secure APIs.

Or:

```
Electronics + Software Engineering + Security + Data
```

could produce a project involving an IoT device that collects data and securely sends it to a backend.

---

## 5. Product Goals

### Primary Goals

The product should:

1. Determine a user's actual skill level.
2. Identify knowledge and practical skill gaps.
3. Build a personalized learning path.
4. Give users concrete things to do rather than simply things to read.
5. Evaluate the user's work.
6. Track evidence of ability over time.
7. Adapt the learning path based on performance.
8. Encourage users to build real projects.
9. Give users an AI mentor they can interact with naturally.
10. Help users understand what they should learn next.

### Secondary Goals

The product should eventually:

- Support multiple learning disciplines.
- Connect theoretical knowledge with practical work.
- Support physical projects and virtual labs.
- Build a long-term technical skill profile.
- Help users develop portfolio-worthy projects.
- Support hardware as a physical mentor interface.

---

## 6. Non-Goals for MVP

The MVP should not attempt to build everything.

Exclude initially:

- Social networking
- Leaderboards
- Multiplayer learning
- Native mobile apps
- Voice mentor
- Physical AI mentor device
- Full course marketplace
- Creator marketplace
- Complex gamification
- Advanced agent architecture
- Automated web research
- Fully autonomous coding agents
- Production-grade code execution sandbox
- Collaborative projects
- Certificates
- Resume/job matching

These can be considered later.

---

## 7. Core User Experience

The primary user journey should be:

```
Create Account
      ↓
Choose Learning Tracks
      ↓
Set Goals
      ↓
Diagnostic Assessment
      ↓
Initial Skill Profile
      ↓
Personalized Learning Path
      ↓
Daily Mission
      ↓
Learn
      ↓
Practice
      ↓
Submit Evidence
      ↓
AI Evaluation
      ↓
Skill Profile Updated
      ↓
Next Mission
```

The system should continuously repeat this loop.

---

## 8. Onboarding

### 8.1 Account Creation

Users create an account using:

- Email/password
- OAuth providers

Authentication implementation can be finalized during technical design.

### 8.2 Track Selection

The user selects the areas they want to learn.

**Example:**

```
What do you want to learn?

☑ Software Engineering
☐ Cybersecurity
☑ Data Analysis
☐ Electronics & Physical Engineering
☐ UI/UX & Product
☐ Computer Science
```

Users should be able to select multiple tracks.

### 8.3 Goals

Ask users what they want to achieve.

**Examples:**

- Become job-ready
- Become a better engineer
- Build personal projects
- Learn for school
- Transition careers
- Explore a new technical field
- Build physical projects
- Understand computer science fundamentals

Users should also be able to enter a custom goal.

### 8.4 Background

Collect lightweight context:

- Current role
- Years of experience
- Technologies they have used
- Previous learning experience
- Approximate weekly learning time
- Preferred learning style
- Existing projects

This information should supplement the assessment rather than determine the user's skill level.

---

## 9. Diagnostic Assessment

This is one of the most important parts of the product.

The system should not simply ask:

> "How good are you at JavaScript?"

It should attempt to determine the answer through evidence.

### Assessment Types

The diagnostic can contain the following question and task types.

#### Knowledge Questions

Multiple-choice and short-answer questions.

#### Conceptual Questions

**Example:**

> Explain the difference between authentication and authorization.

#### Code Questions

**Example:**

> What will this code output and why?

#### Debugging Questions

Give the user broken code and ask them to identify the problem.

#### Scenario Questions

**Example:**

> Your API suddenly receives 100x normal traffic. What would you investigate first?

#### Problem-Solving Questions

Give the user a problem without prescribing the solution.

#### Practical Tasks

Eventually:

> Build a small REST API with these requirements.

#### Security Questions

**Examples:**

- Identify a vulnerability.
- Explain how an attack works.
- Suggest mitigations.

#### Data Tasks

**Examples:**

- Analyze a dataset.
- Write SQL.
- Explain a chart.
- Identify an anomaly.

#### Electronics Tasks

Eventually:

- Design a simple circuit.
- Explain a sensor.
- Simulate a circuit.
- Debug a circuit.

---

## 10. Initial Skill Profile

After the diagnostic, the system generates an initial skill profile.

**Example:**

```
Software Engineering

JavaScript
████████░░ 78%

Git
███████░░░ 70%

Databases
█████░░░░░ 52%

System Design
███░░░░░░░ 31%

Testing
██████░░░░ 61%

Security
████░░░░░░ 40%
```

However, the displayed score is only a representation. The underlying system should store evidence.

**Example:**

```
Skill: SQL

Estimated level: Intermediate

Evidence:
- Diagnostic question 1: Correct
- Diagnostic question 2: Correct
- SQL challenge: Partial
- Query optimization challenge: Failed
- Confidence: Medium
```

This distinction is important:

- **The LLM should not be the source of truth.**
- The application database should contain the learner's structured skill evidence.
- The AI uses that evidence to make recommendations.

---

## 11. Skill System

Skills should be represented independently from courses.

**Example:**

```
Software Engineering
├── Programming
│   ├── Variables & Control Flow
│   ├── Functions
│   ├── Data Structures
│   ├── Algorithms
│   └── Error Handling
│
├── Web Development
│   ├── HTTP
│   ├── APIs
│   ├── Authentication
│   └── Web Security
│
├── Databases
│   ├── SQL
│   ├── Data Modeling
│   ├── Indexing
│   └── Transactions
│
└── Systems
    ├── Scalability
    ├── Distributed Systems
    ├── Caching
    └── Architecture
```

This allows the same skill to appear across different learning paths.

---

## 12. Personalized Learning Path

After assessment, the system creates a learning path.

**Example:**

```
Your current focus

1. HTTP fundamentals
2. REST API design
3. Authentication
4. Database transactions
5. API security
6. Build a secure API
```

Each item should have a reason.

**Example:**

> **Why are you learning this?**
>
> Your assessment shows that you understand APIs conceptually but struggled with authentication and authorization scenarios.

The path should change when new evidence appears.

---

## 13. Daily Missions

The main learning experience should revolve around missions.

Instead of:

> "Read Chapter 4."

The system should say:

> **Mission:** Build a protected API endpoint

### Mission Structure

Each mission contains:

- Objective
- Estimated time
- Skills being practiced
- Required knowledge
- Instructions
- Resources
- Deliverable
- Evaluation criteria

**Example:**

```
MISSION

Build a REST API endpoint that requires authentication.

Time: 60–90 minutes

Skills:
- HTTP
- REST APIs
- Authentication
- Backend development

Deliverable:
A working API endpoint + explanation of your implementation.
```

---

## 14. Mission Types

The system should generate different types of learning activities.

| Type | Description |
|---|---|
| **Learn** | Read/watch/explore a concept. |
| **Practice** | Solve focused exercises. |
| **Build** | Create something. |
| **Debug** | Fix something broken. |
| **Explain** | Explain a concept in your own words. |
| **Analyze** | Inspect data, code, architecture, logs, etc. |
| **Design** | Design a system, circuit, architecture, interface, etc. |
| **Research** | Investigate a technical topic. |
| **Teach** | Explain something as if teaching another person. |
| **Challenge** | Solve a larger open-ended problem. |

---

## 15. Evidence-Based Learning

The user should have multiple ways to prove understanding.

**Examples:**

- Quiz answers
- Written explanations
- Code
- Git repositories
- Project submissions
- Screenshots
- Architecture diagrams
- SQL queries
- Data analyses
- Circuit simulations
- CAD designs
- Reflection responses

The system should treat these as evidence.

---

## 16. Submission Evaluation

After completing a mission, the user submits their work. The AI evaluates it against predefined criteria.

**Example:**

```
Mission: Build an authenticated API

Evaluation

HTTP implementation       8/10
Authentication            6/10
Error handling            7/10
Code quality              8/10
Security                  5/10

Overall evidence: Strong
```

The evaluation should include:

| Section | Content |
|---|---|
| **What you did well** | Specific strengths. |
| **What needs work** | Specific weaknesses. |
| **Why** | Explain the underlying concept. |
| **What to do next** | Recommend the next action. |

---

## 17. Adaptive Learning

The system should change based on evidence.

**Example:**

```
User struggles with SQL joins
        ↓
System identifies weakness
        ↓
Assigns SQL JOIN practice
        ↓
User succeeds
        ↓
Assigns more complex SQL task
        ↓
User succeeds again
        ↓
Skill confidence increases
        ↓
Return to main learning path
```

If the user repeatedly struggles, the system should step backwards.

**Example:**

```
Advanced SQL task
      ↓
Failed
      ↓
Intermediate JOIN task
      ↓
Failed
      ↓
JOIN fundamentals
      ↓
Practice
      ↓
Reassessment
```

---

## 18. Surprise Assessments

The system should occasionally test previously learned skills without announcing exactly when.

**Examples:**

> "Quick challenge: explain what happens when you enter a URL into your browser."

> "You learned SQL joins two weeks ago. Let's see what you remember."

The goal is to measure retention rather than completion.

---

## 19. Weekly Challenge

Each week, the user receives a larger challenge.

**Example:**

> Build a URL shortener

The challenge may combine multiple skills:

- Backend
- Database
- API design
- Authentication
- System design

For another track:

> Analyze this dataset and explain the business insights.

For electronics:

> Build a temperature monitoring system using a sensor and microcontroller.

The weekly challenge should generate stronger evidence than a simple quiz.

---

## 20. Reflection

After major missions or weekly challenges, ask the user short reflection questions.

**Examples:**

- What was difficult?
- What did you understand better?
- What would you do differently?
- What are you still confused about?

Reflection data can help the AI identify uncertainty that isn't visible from scores alone.

---

## 21. AI Mentor

The mentor is the conversational interface to the system.

Users can ask:

- "Why does this work?"
- "I don't understand databases."
- "Give me a harder challenge."
- "Can you explain this like I'm a beginner?"
- "I think I understand this. Test me."
- "What should I learn next?"

The mentor should have access to the user's structured learning context. It should know:

- Selected tracks
- Current learning path
- Skills
- Weaknesses
- Recent missions
- Assessment results
- Previous mistakes
- Current goals
- Recent projects
- Current mission

---

## 22. Mentor Behavior

The mentor should not always immediately give the answer.

Depending on the situation, it should:

- Ask guiding questions.
- Give hints.
- Provide examples.
- Explain concepts.
- Challenge assumptions.
- Generate exercises.
- Recommend resources.
- Test understanding.
- Review submitted work.
- Encourage deeper reasoning.

For example, if a user asks:

> "What's the answer?"

The mentor may respond with a hint first if the user is currently working on an assessment.

---

## 23. AI Architecture

The application should not have one giant AI prompt responsible for everything. Instead, separate AI responsibilities into services/modules.

| Module | Responsibility |
|---|---|
| **Assessment Generator** | Creates diagnostic questions and assessments. |
| **Skill Evaluator** | Interprets assessment evidence. |
| **Learning Planner** | Determines what the user should learn next. |
| **Mission Generator** | Creates practical learning missions. |
| **Submission Evaluator** | Evaluates user work. |
| **Skill Profile Updater** | Converts new evidence into structured skill updates. |
| **Tutor** | Explains concepts and answers questions. |
| **Mentor** | Handles conversational interactions using the user's current context. |

---

## 24. AI Model Architecture

Use a provider abstraction rather than tightly coupling the application to a single model.

The MVP can use OpenAI as the primary provider, while the application architecture should make it possible to introduce another provider later.

Vercel AI SDK is suitable as the application layer because it provides a unified interface for model interactions, structured generation, tool calling, streaming, and multiple model providers.

**Recommended structure:**

```
Application
     ↓
AI Service Layer
     ↓
Vercel AI SDK
     ↓
Model Provider
     ↓
OpenAI
```

Do not introduce unnecessary multi-provider complexity into the MVP.

---

## 25. Structured AI Output

AI responses that affect application state should be structured.

For example, an evaluation should return something conceptually like:

```json
{
  "overallAssessment": "partial",
  "skills": [
    {
      "skill": "authentication",
      "score": 0.65,
      "confidence": 0.82,
      "evidence": "..."
    }
  ],
  "strengths": [],
  "weaknesses": [],
  "recommendedNextStep": "..."
}
```

The application can then validate and store this data.

The AI SDK supports structured generation and tool calling, which fits this architecture.

---

## 26. Dashboard

The dashboard should answer three questions immediately:

1. **Where am I?** Current skill profile and progress.
2. **What am I doing?** Current mission.
3. **What's next?** Upcoming learning activity.

**Example:**

```
Good morning, Victoria.

CURRENT FOCUS
System Design

CURRENT MISSION
Design a scalable notification system

Skills you're developing
████████░░ APIs
██████░░░░ Databases
████░░░░░░ Distributed Systems

Recent evidence
✓ REST API challenge
✓ Database assessment
△ Caching challenge

NEXT
Surprise assessment: HTTP fundamentals
```

---

## 27. Progress Tracking

Track progress at multiple levels.

| Level | Example |
|---|---|
| **Track** | Software Engineering: 42% |
| **Skill** | Databases: 68% |
| **Subskill** | SQL Joins: 82% |
| **Evidence** | 8 successful demonstrations |
| **Missions** | 24 completed |

The system should avoid making "course completion" the primary measure of progress.

---

## 28. Skill Confidence

Every skill should have both:

- Estimated ability
- Confidence in that estimate

**Example:**

```
SQL
Ability: 72%
Confidence: 84%
```

A learner might have:

```
Ability: 70%
Confidence: 35%
```

because there isn't enough evidence yet.

This helps the system know when another assessment is necessary.

---

## 29. Resource Recommendations

Resources can include:

- Documentation
- Articles
- Videos
- Books
- Courses
- Tutorials
- Papers
- Interactive labs
- Coding exercises
- Simulators

Resources should support missions rather than become the product itself.

The system should avoid overwhelming users with a giant resource list. Prefer:

> "You need this concept for your current mission. Start here."

---

## 30. Electronics & Physical Engineering Track

The physical engineering track should eventually support the following.

### Virtual

- Tinkercad Circuits
- Wokwi
- Circuit simulation
- CAD exercises

### Practical

- Arduino
- ESP32
- Sensors
- Motors
- LEDs
- Buttons
- Breadboards
- Servos

### Projects

**Examples:**

- Automatic night light
- Digital thermometer
- Distance sensor
- Reaction-time game
- Plant watering system
- Smart desk
- Mini robot
- Internet-connected sensor

The system should eventually evaluate uploaded project evidence such as:

- Photos
- Videos
- Schematics
- Code
- Simulation links
- Written explanations

---

## 31. Future Physical Mentor

A long-term product direction is a physical device that acts as an interface to the AI mentor.

**Possible components:**

- ESP32 or Raspberry Pi
- Small display
- Buttons/knob
- Speaker
- Microphone
- LEDs
- Wi-Fi

**Potential interaction:**

> **User:** "What am I supposed to learn today?"
>
> **Device:** "Your current mission is to build a REST API. You have approximately 45 minutes remaining."

**This should not be part of the MVP.**

---

## 32. Core Data Model

Conceptually:

```
User
 ├── UserTrack
 ├── SkillEvidence
 ├── Assessment
 │    └── AssessmentAttempt
 ├── LearningPath
 │    └── LearningPathItem
 ├── Mission
 │    └── MissionSubmission
 ├── Quiz
 │    └── QuizAttempt
 ├── MentorConversation
 ├── Progress
 └── Achievement
```

### Important Entities

| Entity | Description |
|---|---|
| **User** | Basic account information. |
| **Track** | Learning discipline. |
| **Skill** | Individual capability. |
| **UserTrack** | Relationship between user and selected track. |
| **SkillEvidence** | Evidence demonstrating ability. |
| **Assessment** | A diagnostic or subsequent assessment. |
| **AssessmentAttempt** | A user's attempt. |
| **LearningPath** | Personalized curriculum. |
| **Mission** | Individual learning activity. |
| **MissionSubmission** | User's submitted work. |
| **Evaluation** | AI-generated evaluation of submitted evidence. |
| **MentorConversation** | Conversation history and context. |

---

## 33. SkillEvidence

This is one of the most important database entities.

**Example:**

```
SkillEvidence

id
user_id
skill_id
source_type
source_id
score
confidence
evidence_summary
created_at
```

`source_type` might be:

- `assessment`
- `quiz`
- `mission`
- `project`
- `manual`
- `reflection`

This creates an auditable history of how the system believes the learner developed a skill.

---

## 34. Recommended Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js, JavaScript, Tailwind CSS, shadcn/ui |
| **Backend** | Next.js Server Actions / API routes, PostgreSQL, Drizzle ORM |
| **Authentication** | Better Auth or Clerk |
| **AI** | Vercel AI SDK, OpenAI |
| **Validation** | Zod |
| **Hosting** | Vercel |
| **Database Hosting** | Neon |
| **Analytics** | PostHog |
| **Error Monitoring** | Sentry |
| **Background Jobs** | Inngest (when needed) |

---

## 35. MVP Features

The MVP should contain:

### Authentication

- Sign up
- Sign in
- Sign out

### Onboarding

- Track selection
- Goals
- Background
- Learning preferences

### Diagnostic

- Initial assessment
- Multiple question types
- AI evaluation

### Skill Profile

- Initial skill estimates
- Skill evidence
- Confidence levels

### Learning Path

- Personalized path
- Current focus
- Upcoming activities

### Missions

- Daily mission
- Mission instructions
- Submission
- AI evaluation

### Quizzes

- Knowledge checks
- Surprise assessments

### Dashboard

- Current mission
- Skill progress
- Recent activity
- Next recommended action

### AI Mentor

- Chat
- Context-aware responses
- Learning assistance

---

## 36. Post-MVP Features

Potential future features:

- GitHub integration
- Automatic repository analysis
- Code execution
- Interactive coding environments
- Browser-based labs
- Virtual electronics labs
- CAD integrations
- Physical project tracking
- Voice mentor
- Mobile app
- Physical mentor device
- Social learning
- Accountability partners
- Leaderboards
- Competitions
- Team projects
- Portfolio generation
- Certifications
- Job-readiness assessments

---

## 37. MVP Success Criteria

The MVP is successful if a user can:

- [ ] Create an account.
- [ ] Select a learning track.
- [ ] Complete an assessment.
- [ ] Receive a meaningful initial skill profile.
- [ ] Receive a personalized learning path.
- [ ] Complete a mission.
- [ ] Submit evidence of their work.
- [ ] Receive useful evaluation.
- [ ] Have their skill profile updated.
- [ ] Receive an appropriate next mission.
- [ ] Ask the AI mentor questions using their learning context.

The most important test is:

> **Does the system become noticeably better at deciding what the learner should do next as it collects more evidence?**

If not, the product is essentially just an AI chatbot with a course UI.

---

## 38. North Star

> Build an AI mentor that continuously figures out what a person knows, what they don't know, and what they should do next to become technically stronger.

The product should optimize for **demonstrated capability**, not content consumption.

---

## 39. Product Principles

### 1. Evidence over self-reporting

Don't rely entirely on users saying they know something.

### 2. Practice over passive consumption

Learning should frequently result in doing something.

### 3. Projects over completion

Finishing a course doesn't necessarily mean someone can apply the knowledge.

### 4. Adaptation over fixed curricula

The learning path should change when new evidence appears.

### 5. Small missions over overwhelming plans

Give the learner a clear next action.

### 6. Explain the "why"

Users should understand why they're being asked to learn something.

### 7. The AI is not the database

AI makes recommendations; the application stores the learner's actual history and evidence.

### 8. Build for multiple disciplines

The underlying learning engine should work for software, security, data, electronics, and other technical disciplines without rebuilding the product from scratch.

---

## 40. The Core Product

The simplest way to describe the entire product is:

```
             ┌──────────────────┐
             │      USER        │
             └────────┬─────────┘
                      ↓
                ┌───────────┐
                │  ASSESS   │
                └─────┬─────┘
                      ↓
              ┌───────────────┐
              │ SKILL PROFILE │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │ LEARNING PLAN │
              └───────┬───────┘
                      ↓
                ┌───────────┐
                │  MISSION  │
                └─────┬─────┘
                      ↓
                ┌───────────┐
                │  PROVE    │
                └─────┬─────┘
                      ↓
               ┌────────────┐
               │  EVALUATE  │
               └──────┬─────┘
                      ↓
               ┌────────────┐
               │   UPDATE   │
               │   SKILLS   │
               └──────┬─────┘
                      │
                      └──────────────→ NEXT MISSION
```

That loop is the product. The AI mentor chat, dashboard, quizzes, resources, projects, and eventually physical hardware all plug into that loop.
