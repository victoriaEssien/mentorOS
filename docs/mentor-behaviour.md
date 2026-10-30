# Mentor behaviour

Companion to [prd.md](prd.md). The PRD describes the product; this describes what the mentor actually does to the learner. When a design decision is unclear, check it against this document.

**Since 30 October 2026** the learning model is weekly themes, a concept a day and a project per theme ([architecture.md](architecture.md)). The spirit below still holds: the app decides what comes next, grades honestly and checks back. Assessments, skill levels, surprise tests and hints are gone; reviews of shaky concepts, asked a new way, do the checking back.

> The mentor is a system that continuously assesses you, figures out your weaknesses, gives you things to learn and build, evaluates what you produce, deliberately tests whether you actually retained it, updates its understanding of your abilities, and then decides what you should tackle next.
>
> The chatbot is just the interface. The product is not "AI teaches me programming", it is "AI manages my technical apprenticeship".

## 1. It assesses you first

You don't tell it "I'm intermediate at JavaScript". It tests you. It can ask you to:

- Answer conceptual questions
- Solve problems
- Explain concepts in your own words
- Read and explain code
- Debug broken code
- Write code
- Design a system
- Analyze a dataset
- Identify a security vulnerability
- Design a circuit
- Explain an engineering concept
- Complete a practical task

Different questions test different levels of understanding. It might discover: "You can build React applications, but your understanding of HTTP, databases, networking and system design is weaker than your coding ability." That is far more useful than a generic "Intermediate Software Engineer" label.

## 2. It builds a picture of what you actually know

```text
Software Engineering

JavaScript           Strong
React                Strong
Next.js              Strong
Git                  Strong
APIs                 Intermediate
SQL                  Intermediate
Networking           Weak
System Design        Weak
Distributed Systems  Beginner
Security             Beginner
```

Underneath, every judgement has evidence:

```text
SQL: 68%
Evidence:
- Passed basic SQL assessment
- Failed query optimization challenge
- Successfully used JOINs
- Struggled with transactions
- Successfully analyzed a dataset using SQL
```

So the profile isn't just AI vibes.

## 3. It tells you what to learn next

Ask "What should I learn today?" and it might say:

> **Today: HTTP fundamentals**
>
> You understand APIs reasonably well, but your assessment showed gaps in how HTTP actually works. Before we move further into backend architecture, I want you to understand requests, responses, headers, status codes, cookies and caching.
>
> **Mission:** Build a tiny HTTP server and inspect requests/responses manually.
> **Estimated time:** 60 minutes.

The next thing isn't predetermined. It's based on current evidence.

## 4. It gives you missions, not just lessons

Instead of "Read this article about databases":

> **Mission:** Design a database for a task management application.
>
> - Identify the entities
> - Define relationships
> - Write the schema
> - Explain your decisions
> - Write five queries
>
> Don't look at a solution first.

## 5. It makes you build things

- "You've learned REST APIs. Now build one."
- "You've learned authentication. Add authentication to your existing project."
- "You've learned caching. Take one of your applications and identify where caching would help."
- "You've learned microcontroller basics. Build a temperature sensor."
- "You've learned SQL and analytics. Here's a dataset. Find three meaningful insights and explain them."

The mentor isn't trying to keep you consuming content. It's trying to make you capable of doing things.

## 6. It deliberately makes things harder

If you keep succeeding, it stops giving you beginner exercises.

```text
Basic SQL → JOINs → Aggregations → Complex queries → Query optimization → Database design → Real-world data problem

Build an API → Secure an API → Design an API → Handle scale → Design a distributed system
```

## 7. It deliberately makes you struggle sometimes

Learning shouldn't always be comfortable. Say "I think I understand caching" and it responds "Okay. I'm going to test that", then gives you a scenario you've never seen. Or: "You've completed the networking section, so I'm giving you a problem that requires networking concepts without telling you which concept is relevant."

The goal is to find out whether you understand something, not whether you can recognise an explanation.

## 8. It surprise-tests you later

Three weeks after you learned something:

> **Quick challenge.** You have 5 minutes. Explain what happens from the moment a user enters `example.com` into their browser until the page appears.

If you struggle, that's useful: "Your initial understanding was good, but your retention has dropped. Let's revisit DNS and HTTP." This is what makes it a long-term mentor rather than a course.

## 9. It evaluates your actual work

You submit code, GitHub repositories, SQL, designs, architecture diagrams, written explanations, data analyses, circuit designs, CAD designs, project screenshots, and eventually videos or photos of physical projects.

The evaluation is never just "Great job!":

```text
Strengths
- Good separation of concerns
- Appropriate database structure

Problems
- Authentication implementation has a security weakness
- Error handling is incomplete
- You haven't considered concurrent requests

Next
Fix the authentication issue, then revisit concurrency.
```

## 10. It explains why it is making you do something

Instead of "Learn Redis":

> I'm asking you to learn caching because you've now built three applications where you're fetching the same data repeatedly. You understand the application layer, but you haven't yet demonstrated that you understand how caching changes system behaviour.

The path should feel intentional, not arbitrary.

## 11. It notices patterns in your weaknesses

If you repeatedly write poor error handling, ignore edge cases, struggle with asynchronous systems, have trouble explaining architectural decisions, or understand implementation but not underlying concepts, it eventually says:

> I've noticed a pattern. Your implementation skills are ahead of your systems reasoning. I'm going to temporarily shift your learning toward architecture and technical decision-making.

## 12. It connects different subjects

Instead of separate boxes for software, security, electronics and data, it can set something like:

> **Build a secure IoT monitoring system.** Build a temperature sensor using an ESP32. Send the readings to an API. Store the data. Visualize the readings. Authenticate the device. Identify potential security vulnerabilities. Explain the architecture.

That one project practises electronics, embedded programming, networking, backend engineering, databases, security, data analysis and system design.

## 13. It gives you projects based on your level

Say "I want to become better at backend engineering" and instead of a 40-hour course it constructs a progression, evaluating you at every stage:

```text
Build a REST API → Add a database → Add authentication → Add validation → Add tests
→ Add caching → Handle background jobs → Handle failures → Scale the system
→ Design a production architecture
```

## 14. It helps you figure out what you don't know

You might think you're pretty good at backend development. The mentor might discover that you implement backend systems well but your knowledge of networking, databases, concurrency and distributed systems is shallow, and then fill those specific gaps.

## 15. It acts as a technical sparring partner

Bring it an architecture and it challenges you instead of just helping you code it:

- Why did you choose PostgreSQL?
- What happens if this service goes down?
- What's your consistency model?
- Where is the bottleneck?
- What happens at 10,000 users?
- What happens if the same request arrives twice?
- What's your security model?
- What would you change if latency mattered more than consistency?

## 16. It tracks your long-term development

```text
TECHNICAL PROFILE

Software Engineering   ████████░░ Strong
Security               █████░░░░░ Developing
Data & Analytics       ██████░░░░ Developing
Electronics            ███░░░░░░░ Beginner
Systems Thinking       ████░░░░░░ Developing

Current focus:     Distributed systems
Current weakness:  Reasoning about failure modes

Recent achievements:
✓ Built authenticated API
✓ Designed database schema
✓ Completed security challenge
✓ Analyzed production dataset

Next milestone:
Design and defend a scalable backend architecture
```

Six months later, the mentor actually knows how you've developed.

## 17. It talks the way you asked, and the standards stay put

You choose how blunt it is: straight talk, direct and fair, or encouraging. That changes the wording, never the score. It also reads the room on its own: gentler after a run of fails, more demanding when you're cruising.

## 18. It helps during a check without giving it away

Stuck on a question? Ask for a hint. You get one nudge at a time, a question to think about or a concept to revisit, and never any part of what the question asks you to produce. Every hint counts against how much that answer proves, and five is the limit. "I don't know" is always a fair answer.

## 19. It can say "no, you're not ready yet"

Ask "Can we move on to Kubernetes?" and it might say: "Not yet. You've been able to use Docker, but your understanding of networking and containers is still inconsistent. Let's do two practical exercises first." It is not a chatbot that obeys every request.

## 20. It eventually makes you independent

The goal isn't "ask the AI everything". It's getting you to the point where you say "Here's a problem. Here's what I think. Here's my architecture. Here's why I made these decisions." The mentor becomes a reviewer, challenger and coach. That is the end state.
