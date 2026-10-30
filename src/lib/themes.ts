/**
 * The curriculum, in order. The app, not the learner, picks the theme: each runs one week (two when
 * its project is bigger) and builds on the ones before. A theme has one concept per day, in the
 * order to learn them, and the shape of its project. High-stakes themes carry official docs to
 * show beside every reference explanation, because a wrong lesson there is costly.
 */

export type ConceptEntry = { slug: string; title: string; angle: string };

export type Theme = {
  slug: string;
  title: string;
  side: "backend" | "frontend" | "full stack";
  weeks: 1 | 2;
  summary: string;
  /** What kind of project the theme's brief should be, for the Project Writer. */
  project: string;
  /** Official docs shown beside reference explanations, for themes where a wrong lesson is costly. */
  docs: { title: string; url: string }[];
  concepts: ConceptEntry[];
};

const k = (slug: string, title: string, angle: string): ConceptEntry => ({ slug, title, angle });

const OWASP = (page: string, title: string) => ({
  title: `OWASP: ${title}`,
  url: `https://cheatsheetseries.owasp.org/cheatsheets/${page}.html`,
});

export const THEMES: readonly Theme[] = [
  {
    slug: "http-apis",
    title: "HTTP and APIs",
    side: "backend",
    weeks: 1,
    summary: "How requests travel and how good APIs are shaped.",
    project: "a small REST API with sensible status codes, pagination and idempotent writes",
    docs: [],
    concepts: [
      k(
        "url-to-page",
        "What happens when you load a URL",
        "DNS, TCP and TLS, the request and response, and what the browser does next.",
      ),
      k(
        "http-methods-status",
        "HTTP methods and status codes",
        "What each method promises, and choosing 2xx, 4xx and 5xx codes correctly.",
      ),
      k(
        "rest-design",
        "Designing a REST API",
        "Resources, URLs, verbs, statelessness and consistent responses.",
      ),
      k(
        "idempotency",
        "Idempotency and safe retries",
        "Which operations are idempotent, why it matters for retries, and idempotency keys.",
      ),
      k(
        "pagination",
        "Pagination",
        "Offset versus cursor pagination and why offsets break on changing data.",
      ),
      k(
        "http-caching",
        "HTTP caching headers",
        "Cache-Control, ETags, revalidation and what browsers and CDNs cache.",
      ),
      k(
        "api-errors-versioning",
        "API errors and versioning",
        "Useful error bodies, and changing an API without breaking clients.",
      ),
    ],
  },
  {
    slug: "databases",
    title: "Databases and data modelling",
    side: "backend",
    weeks: 2,
    summary: "Modelling data well and keeping it correct and fast.",
    project: "a schema-first backend for a real domain with migrations, indexes and concurrency-safe writes",
    docs: [],
    concepts: [
      k(
        "relational-model",
        "The relational model and keys",
        "Tables, primary and foreign keys, and what referential integrity guarantees.",
      ),
      k(
        "normalization",
        "Database normalization",
        "Each fact in one place, 1NF to 3NF with an example, and the anomalies it prevents.",
      ),
      k("sql-joins", "SQL joins", "Inner, left and full joins, unmatched rows, and how joins multiply rows."),
      k(
        "indexes",
        "How indexes work",
        "B-trees, how a query uses one, composite index order, and the write cost.",
      ),
      k(
        "query-plans",
        "Reading a query plan",
        "EXPLAIN output, scans versus index use, and why the planner ignores an index.",
      ),
      k(
        "n-plus-one",
        "The N+1 query problem",
        "How it happens through an ORM, spotting it, and batching or joining to fix it.",
      ),
      k(
        "transactions-acid",
        "Transactions and ACID",
        "Each property with an example of what breaks without it.",
      ),
      k(
        "isolation-levels",
        "Isolation levels and anomalies",
        "Read committed, repeatable read, serializable, and the anomalies each allows.",
      ),
      k(
        "locking",
        "Row locks and optimistic concurrency",
        "SELECT FOR UPDATE, conditional updates, version columns, and lost updates.",
      ),
      k(
        "schema-migrations",
        "Safe schema migrations",
        "Additive changes, backfills, and expand then contract on a live database.",
      ),
      k(
        "connection-pooling",
        "Connection pooling",
        "Why connections are costly, what a pool does, and the serverless problem.",
      ),
      k(
        "orms",
        "What an ORM does for you, and to you",
        "Mapping, query building, the queries it hides, and when to drop to SQL.",
      ),
      k(
        "replication",
        "Replication and read replicas",
        "Primaries and replicas, replication lag, and reading your own writes.",
      ),
      k(
        "denormalization",
        "When to denormalize",
        "Read-heavy trade-offs, duplicated data, and keeping copies in sync.",
      ),
    ],
  },
  {
    slug: "auth",
    title: "Auth and sessions",
    side: "backend",
    weeks: 2,
    summary: "Proving who someone is, keeping them signed in, and deciding what they may do.",
    project:
      "a complete auth system: sign-up, sessions, password reset, OAuth sign-in and server-side authorization",
    docs: [
      OWASP("Authentication_Cheat_Sheet", "Authentication"),
      OWASP("Password_Storage_Cheat_Sheet", "Password storage"),
      OWASP("Session_Management_Cheat_Sheet", "Session management"),
    ],
    concepts: [
      k(
        "password-hashing",
        "Password hashing",
        "Why hashing not encryption, salts, slow hashes like argon2 and bcrypt, and what a breach exposes.",
      ),
      k(
        "server-sessions",
        "Server-side sessions and cookies",
        "Session IDs, where state lives, expiry and logout.",
      ),
      k(
        "cookie-flags",
        "Cookie flags: HttpOnly, Secure, SameSite",
        "What each flag stops and what it doesn't.",
      ),
      k(
        "jwt",
        "JWTs and their trade-offs",
        "Structure and signing, statelessness, and the revocation problem.",
      ),
      k(
        "oauth-oidc",
        "OAuth 2.0 and OpenID Connect",
        "Delegated access versus identity, access and ID tokens, scopes.",
      ),
      k(
        "pkce",
        "The authorization code flow with PKCE",
        "Each step of the flow and what the code verifier protects against.",
      ),
      k(
        "password-reset",
        "Secure password reset",
        "Single-use expiring tokens, not leaking accounts, and ending old sessions.",
      ),
      k(
        "mfa",
        "Multi-factor authentication",
        "Factors, TOTP, recovery codes, and what MFA does and doesn't stop.",
      ),
      k(
        "login-brute-force",
        "Protecting login from brute force",
        "Rate limits, lockouts versus delays, and credential stuffing.",
      ),
      k(
        "authorization",
        "Authorization on the server",
        "Authentication versus authorization, roles, and checking every request.",
      ),
      k(
        "session-fixation",
        "Session fixation and rotation",
        "How fixation works and rotating the session on login and privilege change.",
      ),
      k(
        "passwordless",
        "Magic links and passwordless login",
        "How they work, link expiry, and the email account as the weak point.",
      ),
      k(
        "account-enumeration",
        "Account enumeration",
        "How sign-in and reset flows leak which emails exist, and how to avoid it.",
      ),
      k(
        "passkeys",
        "Passkeys and WebAuthn",
        "Public-key credentials, why they resist phishing, and the registration flow.",
      ),
    ],
  },
  {
    slug: "ui-rendering",
    title: "UI state and rendering",
    side: "frontend",
    weeks: 1,
    summary: "How UI frameworks turn a change in state into an update on screen, and where state should live.",
    project:
      "the same small interactive app (shared state, a long filtered list, derived values) built twice, in two frameworks with different reactivity models, with the updates measured in each and a short write-up comparing them",
    docs: [],
    concepts: [
      k(
        "state-to-screen",
        "From state change to screen update",
        "What every UI framework has to do when state changes, and the three main ways they do it.",
      ),
      k(
        "react-rendering",
        "React: re-renders and reconciliation",
        "Render and commit, what triggers a re-render, keys, and when memoization actually helps.",
      ),
      k(
        "signals",
        "Signals and fine-grained reactivity",
        "How Solid, Vue and Angular track what each value depends on, so only what changed updates.",
      ),
      k(
        "compiled-reactivity",
        "Compiled reactivity in Svelte",
        "What the compiler turns a component into, and what runes changed.",
      ),
      k(
        "effects",
        "Effects, and when you don't need them",
        "Syncing with outside systems in React, Vue and Svelte, and why derived state isn't an effect.",
      ),
      k(
        "state-placement",
        "Where state should live",
        "Local, lifted, server and URL state, and when a store is worth it, in any framework.",
      ),
      k(
        "hydration",
        "Server rendering and hydration",
        "What hydration costs, and how islands (Astro), resumability (Qwik) and server components avoid it.",
      ),
    ],
  },
  {
    slug: "css-a11y",
    title: "CSS layout and accessibility",
    side: "frontend",
    weeks: 1,
    summary: "Layouts that hold up, and interfaces everyone can use.",
    project:
      "an accessible component library (dialog, tabs, menu, form fields) with keyboard support and a responsive layout",
    docs: [],
    concepts: [
      k(
        "box-model",
        "The box model",
        "Content, padding, border and margin, box-sizing, and margin collapse.",
      ),
      k(
        "flexbox",
        "How flexbox distributes space",
        "Main and cross axes, grow, shrink and basis, and alignment.",
      ),
      k("css-grid", "How CSS grid works", "Tracks, fr units, placement, and when grid beats flexbox."),
      k(
        "responsive-design",
        "Responsive design and container queries",
        "Fluid layouts, media versus container queries, and mobile first.",
      ),
      k(
        "semantic-html",
        "Semantic HTML and the accessibility tree",
        "How elements map to roles and why a div button fails.",
      ),
      k(
        "keyboard-focus",
        "Keyboard access and focus management",
        "Tab order, visible focus, and moving focus in dialogs.",
      ),
      k("aria", "ARIA, and when not to use it", "Roles, states and properties, and the first rule of ARIA."),
    ],
  },
  {
    slug: "browser-performance",
    title: "Browser performance",
    side: "frontend",
    weeks: 1,
    summary: "Why pages feel slow and how to make them fast.",
    project:
      "a performance overhaul of a slow page, with before and after measurements of the Core Web Vitals",
    docs: [],
    concepts: [
      k(
        "critical-rendering-path",
        "The critical rendering path",
        "HTML, CSS and JS to pixels, and what blocks rendering.",
      ),
      k("web-vitals", "Core Web Vitals", "LCP, INP and CLS, what each measures, and their usual causes."),
      k(
        "layout-thrashing",
        "Reflow, repaint and layout thrashing",
        "What triggers layout and batching reads and writes.",
      ),
      k(
        "code-splitting",
        "Code splitting and lazy loading",
        "Bundles, dynamic imports, and loading only what a page needs.",
      ),
      k(
        "image-optimization",
        "Image optimization",
        "Formats, responsive sizes, lazy loading and avoiding layout shift.",
      ),
      k(
        "hydration-cost",
        "Hydration and its cost",
        "Attaching interactivity to server HTML and why it can be slow.",
      ),
      k(
        "main-thread",
        "The main thread and long tasks",
        "Why one thread, long tasks, and moving work off it.",
      ),
    ],
  },
  {
    slug: "client-security",
    title: "Client-side security",
    side: "frontend",
    weeks: 1,
    summary: "The attacks that live in the browser and how to stop them.",
    project:
      "hardening a web app: a strict Content Security Policy, safe rendering of user content, CSRF protection and secure token handling",
    docs: [
      OWASP("Cross_Site_Scripting_Prevention_Cheat_Sheet", "XSS prevention"),
      OWASP("Cross-Site_Request_Forgery_Prevention_Cheat_Sheet", "CSRF prevention"),
      OWASP("Content_Security_Policy_Cheat_Sheet", "Content Security Policy"),
    ],
    concepts: [
      k(
        "xss",
        "Cross-site scripting (XSS)",
        "Stored, reflected and DOM XSS, and why escaping output is the fix.",
      ),
      k(
        "csp",
        "Content Security Policy",
        "What a policy restricts, nonces and hashes, and report-only mode.",
      ),
      k(
        "csrf",
        "Cross-site request forgery (CSRF)",
        "How a forged request rides on cookies, and tokens and SameSite.",
      ),
      k(
        "cors",
        "CORS and the same-origin policy",
        "What the browser enforces, preflight requests, and what CORS doesn't protect.",
      ),
      k(
        "token-storage",
        "Where to store tokens in the browser",
        "Cookies versus localStorage and what XSS can reach.",
      ),
      k("clickjacking", "Clickjacking and frame protection", "How it works and frame-ancestors."),
      k(
        "third-party-scripts",
        "Third-party scripts and supply chain risk",
        "What a script tag can do, subresource integrity, and dependency risk.",
      ),
    ],
  },
  {
    slug: "payments",
    title: "Payments",
    side: "full stack",
    weeks: 2,
    summary: "How money actually moves, and taking it without losing any.",
    project:
      "a Stripe checkout flow in Next.js: payments, webhooks that fulfill orders exactly once, refunds and a subscription",
    docs: [
      { title: "Stripe: Payments", url: "https://docs.stripe.com/payments" },
      { title: "Stripe: Webhooks", url: "https://docs.stripe.com/webhooks" },
    ],
    concepts: [
      k(
        "card-payment-flow",
        "How a card payment settles",
        "Authorization, capture and settlement, and the issuer, acquirer and network.",
      ),
      k(
        "payment-intents",
        "Payment intents and their states",
        "Why payments are stateful and the states a payment moves through.",
      ),
      k(
        "hosted-checkout",
        "Hosted checkout versus embedded payments",
        "What each puts on your servers and the trade-offs.",
      ),
      k(
        "three-d-secure",
        "3D Secure and strong customer authentication",
        "Why banks challenge payments and how the flow handles it.",
      ),
      k(
        "webhook-fulfillment",
        "Fulfilling orders from webhooks",
        "Why the success page isn't proof, verifying signatures, and fulfilling once.",
      ),
      k(
        "payment-idempotency",
        "Idempotency keys for payments",
        "Retries without double charges and how keys are stored.",
      ),
      k(
        "money-in-code",
        "Representing money in code",
        "Minor units, why floats lose money, currencies and rounding.",
      ),
      k("refunds", "Refunds", "Full and partial refunds, timing, and keeping your records in step."),
      k(
        "disputes",
        "Disputes and chargebacks",
        "Who starts one, the timeline, and what evidence a merchant gives.",
      ),
      k(
        "subscriptions",
        "Subscriptions and recurring billing",
        "Plans, billing cycles, trials, and renewals.",
      ),
      k("proration", "Proration and plan changes", "Charging fairly when a plan changes mid-cycle."),
      k(
        "failed-payments",
        "Failed payments and dunning",
        "Why renewals fail, retries, and recovering customers.",
      ),
      k(
        "pci-scope",
        "PCI DSS scope and tokenization",
        "What PCI requires and how tokenization keeps card data off your servers.",
      ),
      k(
        "ledgers",
        "Double-entry ledgers",
        "Debits and credits, two sides to every movement, and auditable balances.",
      ),
    ],
  },
  {
    slug: "caching-jobs",
    title: "Caching and background jobs",
    side: "backend",
    weeks: 1,
    summary: "Doing work once, and doing slow work outside the request.",
    project:
      "a backend with a Redis cache that invalidates correctly and a job queue with retries and a dead-letter queue",
    docs: [],
    concepts: [
      k(
        "cache-aside",
        "Cache-aside and invalidation",
        "Reading through a cache, writes, and the hard part: invalidation.",
      ),
      k(
        "cache-stampede",
        "Cache stampedes",
        "Why many misses at once hurt, and locks, early refresh and jitter.",
      ),
      k("redis", "What Redis is good for", "Data structures, expiry, and uses beyond caching."),
      k("cdn-caching", "CDNs and edge caching", "Cache keys, TTLs, purging and what belongs at the edge."),
      k(
        "job-queues",
        "Background jobs and queues",
        "Moving work out of the request, workers, and at-least-once delivery.",
      ),
      k(
        "retries-backoff",
        "Retries, backoff and dead-letter queues",
        "Exponential backoff with jitter, poison messages and idempotent jobs.",
      ),
      k("scheduled-jobs", "Scheduled jobs and cron", "Running work on a schedule, overlap, and missed runs."),
    ],
  },
  {
    slug: "realtime",
    title: "Realtime",
    side: "full stack",
    weeks: 1,
    summary: "Getting updates to users as they happen.",
    project:
      "a realtime feature such as a collaborative list or chat with presence, optimistic updates and reconnection",
    docs: [],
    concepts: [
      k(
        "polling-sse-websockets",
        "Polling, server-sent events and WebSockets",
        "How each works and choosing between them.",
      ),
      k("websockets", "How WebSockets work", "The upgrade handshake, frames, and keeping connections alive."),
      k("pub-sub", "Pub/sub", "Publishers, subscribers and channels, and fanning out across servers."),
      k("presence", "Presence and typing indicators", "Tracking who's online and heartbeats."),
      k(
        "optimistic-ui",
        "Optimistic UI",
        "Updating before the server confirms, and rolling back on failure.",
      ),
      k(
        "delivery-guarantees",
        "Message ordering and delivery guarantees",
        "At-most, at-least and exactly once, and ordering.",
      ),
      k(
        "scaling-realtime",
        "Scaling realtime connections",
        "Sticky sessions, connection limits and a message backbone.",
      ),
    ],
  },
  {
    slug: "testing-deploy",
    title: "Testing and deployment",
    side: "full stack",
    weeks: 1,
    summary: "Shipping changes with confidence.",
    project:
      "a test suite and CI pipeline for an existing project: unit, integration with a real database, an end-to-end test, and a preview deploy",
    docs: [],
    concepts: [
      k(
        "testing-pyramid",
        "The testing pyramid",
        "Unit, integration and end-to-end tests, and what each catches.",
      ),
      k("test-doubles", "Mocks, stubs and fakes", "The differences and the risk of mocking too much."),
      k(
        "integration-tests",
        "Integration tests with a real database",
        "Why a real database, isolation between tests, and speed.",
      ),
      k("e2e-tests", "End-to-end tests", "What they prove, flakiness, and keeping them few."),
      k(
        "continuous-integration",
        "Continuous integration",
        "What runs on every push and why fast feedback matters.",
      ),
      k("deploy-strategies", "Blue-green and canary deploys", "Rolling out safely and rolling back."),
      k(
        "config-secrets",
        "Configuration and secrets across environments",
        "Environment config, secrets handling and parity.",
      ),
    ],
  },
  {
    slug: "ai-features",
    title: "AI features",
    side: "full stack",
    weeks: 1,
    summary: "Building product features on language models that actually work.",
    project:
      "an AI feature with retrieval over your own data, structured output, streaming, and an evaluation set",
    docs: [],
    concepts: [
      k(
        "tokens-context",
        "Tokens and context windows",
        "What a token is, context limits, and how both drive cost.",
      ),
      k(
        "embeddings",
        "Embeddings and similarity search",
        "Text as vectors, cosine similarity, and what embeddings miss.",
      ),
      k(
        "rag",
        "Retrieval-augmented generation",
        "Chunking, retrieval, grounding answers, and where it fails.",
      ),
      k(
        "structured-output",
        "Structured output and validation",
        "Schemas, validation, and recovering from bad output.",
      ),
      k(
        "streaming-responses",
        "Streaming model responses",
        "Tokens as they arrive, server-sent events, and cancellation.",
      ),
      k(
        "prompt-injection",
        "Prompt injection",
        "How untrusted text hijacks a model and limiting the damage.",
      ),
      k(
        "llm-evals",
        "Evaluating LLM features",
        "Golden sets, graders, and catching regressions before shipping.",
      ),
    ],
  },
  {
    slug: "nextjs",
    title: "Next.js rendering and data",
    side: "full stack",
    weeks: 1,
    summary: "Where Next.js renders, fetches and caches, and why.",
    project:
      "a Next.js app that uses static, dynamic and streamed rendering on purpose, with server actions and correct revalidation",
    docs: [],
    concepts: [
      k(
        "rendering-strategies",
        "SSR, SSG, ISR and streaming",
        "Where HTML is made in each and the trade-offs.",
      ),
      k(
        "app-router-data",
        "Data fetching in the App Router",
        "Fetching in server components, parallel versus sequential, and deduplication.",
      ),
      k("server-actions", "Server actions", "How they run, form integration, and validating input."),
      k(
        "next-caching",
        "Caching and revalidation in Next.js",
        "What gets cached, revalidating by time and tag.",
      ),
      k("middleware", "Middleware and the edge", "What middleware can do, where it runs, and its limits."),
      k("route-handlers", "Route handlers", "Building API endpoints in the App Router and when to use them."),
      k(
        "suspense-streaming",
        "Suspense and streaming",
        "Loading states, streaming HTML, and ordering boundaries.",
      ),
    ],
  },
  {
    slug: "files-storage",
    title: "File uploads and storage",
    side: "full stack",
    weeks: 1,
    summary: "Accepting, storing and serving files safely.",
    project:
      "an upload feature with presigned direct uploads to object storage, image processing and safe serving",
    docs: [],
    concepts: [
      k("multipart-uploads", "How file uploads work", "Multipart form data, streaming and size limits."),
      k("presigned-urls", "Presigned URLs", "Direct uploads to storage and what the signature limits."),
      k("object-storage", "Object storage", "Buckets and keys, versus a filesystem, and consistency."),
      k(
        "media-processing",
        "Processing images and media",
        "Resizing, formats, and doing it in the background.",
      ),
      k(
        "resumable-uploads",
        "Resumable and chunked uploads",
        "Uploading large files reliably over bad connections.",
      ),
      k(
        "upload-security",
        "Securing file uploads",
        "Validating type and size, malware, and never trusting the filename.",
      ),
      k("serving-files", "Serving files from a CDN", "Private versus public files, signed URLs and caching."),
    ],
  },
  {
    slug: "search",
    title: "Search",
    side: "full stack",
    weeks: 1,
    summary: "Helping people find things quickly.",
    project:
      "search over your own data: Postgres full-text search with ranking and typo tolerance, and an instant search UI",
    docs: [],
    concepts: [
      k(
        "full-text-search",
        "Full-text search in Postgres",
        "tsvector, tsquery, and indexing text for search.",
      ),
      k("inverted-index", "Inverted indexes", "How search engines map terms to documents."),
      k("ranking", "Relevance and ranking", "Term frequency, BM25 at a high level, and boosting fields."),
      k("fuzzy-search", "Fuzzy matching and typo tolerance", "Trigrams, edit distance, and their costs."),
      k(
        "search-engines",
        "When to use a search engine",
        "Postgres versus a dedicated engine, and keeping them in sync.",
      ),
      k("vector-search", "Vector search", "Semantic search with embeddings and combining it with keywords."),
      k("search-ux", "Search UX", "Debouncing, instant results, highlighting and empty states."),
    ],
  },
  {
    slug: "observability",
    title: "Observability",
    side: "backend",
    weeks: 1,
    summary: "Knowing what production is doing and fixing it fast.",
    project:
      "instrumenting an app with structured logs, metrics, traces and error tracking, plus an alert and a runbook",
    docs: [],
    concepts: [
      k("structured-logging", "Structured logging", "Logs as data, levels, and correlation IDs."),
      k("metrics", "Metrics", "Counters, gauges and histograms, and what to measure."),
      k("tracing", "Distributed tracing", "Spans and traces across services and finding slow paths."),
      k("error-tracking", "Error tracking", "Capturing errors with context and grouping them."),
      k("slos", "SLOs and error budgets", "Service levels, budgets, and using them to decide."),
      k("alerting", "Alerting that helps", "Alerting on symptoms, avoiding noise, and runbooks."),
      k(
        "incident-debugging",
        "Debugging a production incident",
        "Triage, finding the cause from signals, and the write-up.",
      ),
    ],
  },
  {
    slug: "system-design",
    title: "System design",
    side: "backend",
    weeks: 2,
    summary: "Designing systems that scale, and talking through the trade-offs.",
    project:
      "a scaled-down real system (a URL shortener or rate limiter) with a written design doc, load test and the trade-offs you made",
    docs: [],
    concepts: [
      k(
        "requirements-estimates",
        "Requirements and estimates",
        "Functional and non-functional requirements and back-of-envelope numbers.",
      ),
      k("load-balancing", "Load balancing", "Algorithms, health checks, and layer 4 versus layer 7."),
      k(
        "horizontal-scaling",
        "Horizontal scaling and statelessness",
        "Adding machines, stateless services, and where state goes.",
      ),
      k("cap-theorem", "The CAP theorem", "What the trade-off really is, with examples."),
      k("eventual-consistency", "Eventual consistency", "What it guarantees and designing around it."),
      k("sharding", "Sharding", "Splitting data, choosing a shard key, and hot spots."),
      k(
        "consistent-hashing",
        "Consistent hashing",
        "Adding and removing nodes without reshuffling everything.",
      ),
      k("queues-in-design", "Queues in system design", "Decoupling, smoothing load, and back pressure."),
      k(
        "rate-limiter-design",
        "Designing a rate limiter",
        "Algorithms, distributed counters, and where to enforce it.",
      ),
      k(
        "url-shortener-design",
        "Designing a URL shortener",
        "IDs, storage, redirects and analytics at scale.",
      ),
      k("news-feed-design", "Designing a news feed", "Fan-out on write versus read, ranking and caching."),
      k("distributed-locks", "Distributed locks", "Why they're hard, leases and fencing tokens."),
      k(
        "read-write-heavy",
        "Read-heavy versus write-heavy systems",
        "Patterns for each and how they change the design.",
      ),
      k(
        "design-tradeoffs",
        "Talking through trade-offs",
        "Naming the trade-offs, comparing options, and deciding out loud.",
      ),
    ],
  },
];

export const themeBySlug = (slug: string) => THEMES.find((theme) => theme.slug === slug) ?? null;

export function findConcept(slug: string): { theme: Theme; concept: ConceptEntry } | null {
  for (const theme of THEMES) {
    const concept = theme.concepts.find((entry) => entry.slug === slug);
    if (concept) return { theme, concept };
  }
  return null;
}

/** The theme after the given one, starting again at the top once the curriculum runs out. */
export function nextTheme(previous: string | null): Theme {
  const index = previous ? THEMES.findIndex((theme) => theme.slug === previous) : -1;
  return THEMES[(index + 1) % THEMES.length]!;
}
