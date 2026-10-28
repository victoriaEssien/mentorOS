/**
 * The skill taxonomy: three active tracks every learner learns (Software Engineering, DSA, CS
 * Foundations) and four shelved ones, each a tree of groups and assessable skills.
 *
 * - Groups (no `parent`) organise a track's tree; leaf skills are what assessments and missions
 *   measure, so every leaf has a description the AI modules can read.
 * - A skill has one home (`track` + `parent`) and can be placed in other tracks with `alsoIn`.
 *   Placements share one evidence history: SQL learned as an engineer counts for analysis too.
 * - The seed upserts by slug, so this file is the source of truth for names and placements.
 */

export type SeedTrack = {
  slug: string;
  name: string;
  description: string;
  /**
   * Shelved tracks are kept, not deleted: nobody learns them as a track, but missions in the active
   * tracks may draw on their skills when the work needs them.
   */
  shelved?: boolean;
};

export type SeedSkill = {
  slug: string;
  name: string;
  track: string;
  /** Group slug in the home track. Omit for groups. */
  parent?: string;
  description?: string;
  /** Extra placements in other tracks' trees. */
  alsoIn?: { track: string; parent: string }[];
};

/**
 * Every learner learns the active tracks, in this order; nobody picks. The bar is the technical
 * interview at the top companies, so DSA is a track of its own.
 */
export const tracks: SeedTrack[] = [
  {
    slug: "software-engineering",
    name: "Software Engineering",
    description: "Programming, web, databases and systems, built the way strong teams build them.",
  },
  {
    slug: "dsa",
    name: "Data Structures & Algorithms",
    description: "The patterns coding interviews test, from arrays and hashing to dynamic programming.",
  },
  {
    slug: "cs-foundations",
    name: "Computer Science Foundations",
    description: "Computer systems, memory, networks and theory.",
  },
  {
    slug: "cybersecurity",
    name: "Cybersecurity",
    description: "Attacks, defences and secure design.",
    shelved: true,
  },
  {
    slug: "data-analysis",
    name: "Data Analysis & Analytics",
    description: "SQL, analysis and communicating insight.",
    shelved: true,
  },
  {
    slug: "electronics",
    name: "Electronics & Physical Engineering",
    description: "Circuits, microcontrollers, sensors and physical builds.",
    shelved: true,
  },
  {
    slug: "ui-ux-product",
    name: "UI/UX & Product",
    description: "Interface design, usability and product thinking.",
    shelved: true,
  },
];

const se = "software-engineering";
const dsa = "dsa";
const sec = "cybersecurity";
const data = "data-analysis";
const elec = "electronics";
const ux = "ui-ux-product";
const cs = "cs-foundations";

export const skills: SeedSkill[] = [
  // Software Engineering
  { slug: "programming", name: "Programming", track: se },
  {
    slug: "variables-control-flow",
    name: "Variables & Control Flow",
    track: se,
    parent: "programming",
    description: "Values, types, conditionals and loops; reading what a short program does.",
  },
  {
    slug: "functions",
    name: "Functions",
    track: se,
    parent: "programming",
    description: "Parameters, return values, scope, closures and breaking code into units.",
  },
  {
    slug: "error-handling",
    name: "Error Handling",
    track: se,
    parent: "programming",
    description: "Exceptions and error values, failing loudly, recovering cleanly, edge cases.",
  },
  {
    slug: "async-programming",
    name: "Asynchronous Programming",
    track: se,
    parent: "programming",
    description: "Callbacks, promises, async/await, concurrency hazards and ordering of events.",
  },

  { slug: "web-development", name: "Web Development", track: se },
  {
    slug: "http",
    name: "HTTP",
    track: se,
    parent: "web-development",
    description: "Requests and responses, methods, status codes, headers, cookies and caching.",
  },
  {
    slug: "apis",
    name: "APIs",
    track: se,
    parent: "web-development",
    description: "Designing and consuming REST APIs: resources, contracts, versioning, errors.",
  },
  {
    slug: "authentication",
    name: "Authentication & Authorization",
    track: se,
    parent: "web-development",
    description: "Sessions, tokens, password storage, OAuth, and deciding who may do what.",
    alsoIn: [{ track: sec, parent: "security-foundations" }],
  },
  {
    slug: "frontend-fundamentals",
    name: "Frontend Fundamentals",
    track: se,
    parent: "web-development",
    description: "HTML, CSS and JavaScript in the browser; the DOM, events and rendering.",
  },

  { slug: "databases", name: "Databases", track: se },
  {
    slug: "sql",
    name: "SQL",
    track: se,
    parent: "databases",
    description: "Selecting, filtering, joining and modifying data with SQL.",
    alsoIn: [{ track: data, parent: "data-querying" }],
  },
  {
    slug: "data-modeling",
    name: "Data Modeling",
    track: se,
    parent: "databases",
    description: "Entities, relationships, keys and normalisation; designing a schema for a problem.",
  },
  {
    slug: "indexing",
    name: "Indexing & Query Performance",
    track: se,
    parent: "databases",
    description: "How indexes work, reading query plans, and why a query is slow.",
  },
  {
    slug: "transactions",
    name: "Transactions",
    track: se,
    parent: "databases",
    description: "ACID, isolation levels, locking, and what happens when two writes collide.",
  },

  { slug: "systems", name: "Systems", track: se },
  {
    slug: "architecture",
    name: "Architecture",
    track: se,
    parent: "systems",
    description: "Structuring an application: layers, boundaries, trade-offs and explaining decisions.",
  },
  {
    slug: "caching",
    name: "Caching",
    track: se,
    parent: "systems",
    description: "Where caches sit, invalidation, consistency trade-offs and when caching helps.",
  },
  {
    slug: "scalability",
    name: "Scalability",
    track: se,
    parent: "systems",
    description: "Finding bottlenecks, scaling reads and writes, queues and load.",
  },
  {
    slug: "distributed-systems",
    name: "Distributed Systems",
    track: se,
    parent: "systems",
    description: "Partial failure, retries, idempotency, consistency models and coordination.",
  },
  {
    slug: "observability",
    name: "Observability",
    track: se,
    parent: "systems",
    description: "Logs, metrics and traces; knowing what a running system is doing and why.",
  },

  { slug: "engineering-practice", name: "Engineering Practice", track: se },
  {
    slug: "version-control",
    name: "Version Control",
    track: se,
    parent: "engineering-practice",
    description: "Git commits, branches, merging, resolving conflicts and reading history.",
  },
  {
    slug: "testing",
    name: "Testing",
    track: se,
    parent: "engineering-practice",
    description: "Unit and integration tests, what to test, fixtures and testing behaviour not code.",
  },
  {
    slug: "debugging",
    name: "Debugging",
    track: se,
    parent: "engineering-practice",
    description: "Reproducing, isolating and fixing defects; reading stack traces and logs.",
  },
  {
    slug: "containers",
    name: "Containers",
    track: se,
    parent: "engineering-practice",
    description: "Images, containers, Dockerfiles and running services consistently.",
  },
  {
    slug: "ci-cd",
    name: "CI/CD",
    track: se,
    parent: "engineering-practice",
    description: "Automated builds, tests and deploys; keeping the main branch shippable.",
  },

  // Cybersecurity
  { slug: "security-foundations", name: "Security Foundations", track: sec },
  {
    slug: "threat-modeling",
    name: "Threat Modeling",
    track: sec,
    parent: "security-foundations",
    description: "Assets, attackers and attack surfaces; deciding what to defend first.",
    alsoIn: [{ track: se, parent: "systems" }],
  },
  {
    slug: "cryptography",
    name: "Applied Cryptography",
    track: sec,
    parent: "security-foundations",
    description: "Hashing, symmetric and public-key encryption, signatures, and using them correctly.",
  },

  { slug: "security-networking", name: "Network Security", track: sec },
  {
    slug: "tls",
    name: "TLS",
    track: sec,
    parent: "security-networking",
    description: "How TLS protects traffic, certificates and chains of trust, common misconfigurations.",
  },
  {
    slug: "network-defense",
    name: "Network Defense",
    track: sec,
    parent: "security-networking",
    description: "Firewalls, segmentation, intrusion detection and reading traffic for threats.",
  },

  { slug: "application-security", name: "Application Security", track: sec },
  {
    slug: "web-security",
    name: "Web Security",
    track: sec,
    parent: "application-security",
    description: "The OWASP Top 10: XSS, CSRF, broken access control, SSRF and their mitigations.",
    alsoIn: [{ track: se, parent: "web-development" }],
  },
  {
    slug: "injection-attacks",
    name: "Injection Attacks",
    track: sec,
    parent: "application-security",
    description: "SQL, command and template injection: how they work and how to prevent them.",
  },
  {
    slug: "secure-coding",
    name: "Secure Coding",
    track: sec,
    parent: "application-security",
    description: "Validating input, handling secrets, least privilege and safe defaults in code.",
  },

  { slug: "offensive-security", name: "Offensive Security", track: sec },
  {
    slug: "reconnaissance",
    name: "Reconnaissance",
    track: sec,
    parent: "offensive-security",
    description: "Mapping a target's surface: enumeration, scanning and open-source intelligence.",
  },
  {
    slug: "exploitation",
    name: "Exploitation",
    track: sec,
    parent: "offensive-security",
    description: "Turning a vulnerability into access in a lab, and explaining the chain of steps.",
  },
  {
    slug: "privilege-escalation",
    name: "Privilege Escalation",
    track: sec,
    parent: "offensive-security",
    description: "Moving from limited to elevated access on Linux and Windows systems.",
  },

  { slug: "defensive-operations", name: "Defensive Operations", track: sec },
  {
    slug: "detection",
    name: "Logging & Detection",
    track: sec,
    parent: "defensive-operations",
    description: "What to log, writing detections and telling an attack from noise.",
  },
  {
    slug: "incident-response",
    name: "Incident Response",
    track: sec,
    parent: "defensive-operations",
    description: "Containing, investigating and recovering from an incident, then learning from it.",
  },
  {
    slug: "vulnerability-management",
    name: "Vulnerability Management",
    track: sec,
    parent: "defensive-operations",
    description: "Finding, prioritising and fixing vulnerabilities across systems and dependencies.",
  },

  // Data Analysis & Analytics
  { slug: "data-fundamentals", name: "Data Fundamentals", track: data },
  {
    slug: "spreadsheets",
    name: "Spreadsheets",
    track: data,
    parent: "data-fundamentals",
    description: "Formulas, lookups, pivot tables and building a model someone else can follow.",
  },
  {
    slug: "data-cleaning",
    name: "Data Cleaning",
    track: data,
    parent: "data-fundamentals",
    description: "Types, missing values, duplicates and outliers; making raw data trustworthy.",
  },
  {
    slug: "descriptive-statistics",
    name: "Descriptive Statistics",
    track: data,
    parent: "data-fundamentals",
    description: "Averages, spread, distributions and choosing the right summary for the data.",
  },

  { slug: "data-querying", name: "Querying", track: data },
  {
    slug: "analytical-sql",
    name: "Analytical SQL",
    track: data,
    parent: "data-querying",
    description: "Aggregations, grouping, window functions and CTEs for answering business questions.",
  },

  { slug: "data-analysis-methods", name: "Analysis", track: data },
  {
    slug: "exploratory-analysis",
    name: "Exploratory Analysis",
    track: data,
    parent: "data-analysis-methods",
    description: "Asking a dataset questions, spotting patterns and anomalies, forming hypotheses.",
  },
  {
    slug: "inferential-statistics",
    name: "Inferential Statistics",
    track: data,
    parent: "data-analysis-methods",
    description: "Sampling, confidence intervals and significance; how sure a conclusion can be.",
  },
  {
    slug: "experimentation",
    name: "Experimentation",
    track: data,
    parent: "data-analysis-methods",
    description: "Designing and reading A/B tests, and the traps that make results lie.",
  },
  {
    slug: "python-data",
    name: "Python for Data",
    track: data,
    parent: "data-analysis-methods",
    description: "Loading, reshaping and analysing data with pandas in a notebook.",
  },

  { slug: "data-communication", name: "Communicating Insight", track: data },
  {
    slug: "data-visualization",
    name: "Data Visualization",
    track: data,
    parent: "data-communication",
    description: "Choosing the chart that answers the question and making it honest and readable.",
  },
  {
    slug: "data-storytelling",
    name: "Data Storytelling",
    track: data,
    parent: "data-communication",
    description: "Turning an analysis into a recommendation a non-analyst can act on.",
  },
  {
    slug: "metrics-design",
    name: "Metrics Design",
    track: data,
    parent: "data-communication",
    description: "Defining metrics and KPIs that measure what matters and resist gaming.",
    alsoIn: [{ track: ux, parent: "product-thinking" }],
  },

  // Electronics & Physical Engineering
  { slug: "circuit-fundamentals", name: "Circuit Fundamentals", track: elec },
  {
    slug: "ohms-law",
    name: "Voltage, Current & Resistance",
    track: elec,
    parent: "circuit-fundamentals",
    description: "Ohm's law and power; predicting what a simple circuit will do.",
  },
  {
    slug: "circuit-analysis",
    name: "Circuit Analysis",
    track: elec,
    parent: "circuit-fundamentals",
    description: "Series and parallel networks, voltage dividers and Kirchhoff's laws.",
  },
  {
    slug: "passive-components",
    name: "Passive Components",
    track: elec,
    parent: "circuit-fundamentals",
    description: "Resistors, capacitors, inductors and diodes: what each does and how to choose one.",
  },
  {
    slug: "measurement",
    name: "Breadboarding & Measurement",
    track: elec,
    parent: "circuit-fundamentals",
    description: "Building on a breadboard and measuring with a multimeter safely and correctly.",
  },

  { slug: "microcontrollers", name: "Microcontrollers", track: elec },
  {
    slug: "arduino",
    name: "Arduino Basics",
    track: elec,
    parent: "microcontrollers",
    description: "Boards, the sketch lifecycle, uploading code and the serial monitor.",
  },
  {
    slug: "digital-io",
    name: "Digital I/O",
    track: elec,
    parent: "microcontrollers",
    description: "Reading buttons and driving LEDs: pull-ups, debouncing and current limits.",
  },
  {
    slug: "analog-pwm",
    name: "Analog Input & PWM",
    track: elec,
    parent: "microcontrollers",
    description: "Reading analog sensors with an ADC and controlling power with PWM.",
  },
  {
    slug: "embedded-programming",
    name: "Embedded Programming",
    track: elec,
    parent: "microcontrollers",
    description: "Timing without blocking, interrupts, state machines and memory limits on small chips.",
  },

  { slug: "sensors-actuators", name: "Sensors & Actuators", track: elec },
  {
    slug: "sensors",
    name: "Sensors",
    track: elec,
    parent: "sensors-actuators",
    description: "Temperature, light, distance and motion sensors: wiring, calibration and noise.",
  },
  {
    slug: "motors",
    name: "Motors & Servos",
    track: elec,
    parent: "sensors-actuators",
    description: "Driving DC motors, servos and steppers safely with drivers and transistors.",
  },
  {
    slug: "power",
    name: "Power Supplies",
    track: elec,
    parent: "sensors-actuators",
    description: "Batteries, regulators and power budgets; keeping a build alive and safe.",
  },

  { slug: "embedded-communication", name: "Communication", track: elec },
  {
    slug: "serial-protocols",
    name: "Serial Protocols",
    track: elec,
    parent: "embedded-communication",
    description: "UART, I2C and SPI: wiring, addressing and reading a datasheet's timing.",
  },
  {
    slug: "iot-connectivity",
    name: "Wireless & IoT",
    track: elec,
    parent: "embedded-communication",
    description: "Wi-Fi on an ESP32, MQTT and HTTP from a device, and securing it.",
  },

  { slug: "physical-design", name: "Design & Build", track: elec },
  {
    slug: "schematics",
    name: "Schematics",
    track: elec,
    parent: "physical-design",
    description: "Reading and drawing schematics, and simulating a circuit before building it.",
  },
  {
    slug: "soldering",
    name: "Soldering & Assembly",
    track: elec,
    parent: "physical-design",
    description: "Soldering, perfboard layout and building something that survives being moved.",
  },
  {
    slug: "circuit-debugging",
    name: "Debugging Circuits",
    track: elec,
    parent: "physical-design",
    description: "Finding why a circuit doesn't work: measuring, isolating and testing hypotheses.",
  },

  // UI/UX & Product
  { slug: "ux-research", name: "Research", track: ux },
  {
    slug: "user-research",
    name: "User Research",
    track: ux,
    parent: "ux-research",
    description: "Interviews and observation; learning what people need rather than what they say.",
  },
  {
    slug: "usability-testing",
    name: "Usability Testing",
    track: ux,
    parent: "ux-research",
    description: "Planning and running usability tests and turning findings into changes.",
  },

  { slug: "interaction-design", name: "Interaction Design", track: ux },
  {
    slug: "information-architecture",
    name: "Information Architecture",
    track: ux,
    parent: "interaction-design",
    description: "Organising content and navigation so people can find what they came for.",
  },
  {
    slug: "user-flows",
    name: "User Flows",
    track: ux,
    parent: "interaction-design",
    description: "Mapping tasks step by step, including errors, empty states and edge cases.",
  },
  {
    slug: "prototyping",
    name: "Prototyping",
    track: ux,
    parent: "interaction-design",
    description: "Building prototypes at the right fidelity to answer a specific design question.",
  },
  {
    slug: "accessibility",
    name: "Accessibility",
    track: ux,
    parent: "interaction-design",
    description: "Designing for keyboard, screen reader and low-vision users; WCAG in practice.",
    alsoIn: [{ track: se, parent: "web-development" }],
  },

  { slug: "visual-design", name: "Visual Design", track: ux },
  {
    slug: "typography",
    name: "Typography",
    track: ux,
    parent: "visual-design",
    description: "Choosing and setting type: scale, hierarchy, measure and readability.",
  },
  {
    slug: "color",
    name: "Color & Contrast",
    track: ux,
    parent: "visual-design",
    description: "Building palettes with meaning and sufficient contrast in light and dark modes.",
  },
  {
    slug: "layout-hierarchy",
    name: "Layout & Hierarchy",
    track: ux,
    parent: "visual-design",
    description: "Grids, spacing and visual hierarchy; directing attention on a screen.",
  },
  {
    slug: "design-systems",
    name: "Design Systems",
    track: ux,
    parent: "visual-design",
    description: "Tokens, components and documentation that keep a product consistent as it grows.",
  },

  { slug: "product-thinking", name: "Product Thinking", track: ux },
  {
    slug: "problem-framing",
    name: "Problem Framing",
    track: ux,
    parent: "product-thinking",
    description: "Defining the problem, the user and the outcome before choosing a solution.",
  },
  {
    slug: "prioritization",
    name: "Prioritization",
    track: ux,
    parent: "product-thinking",
    description: "Choosing what to build next with evidence, and saying no to the rest.",
  },

  // Data Structures & Algorithms: the patterns coding interviews are built from.
  { slug: "dsa-foundations", name: "Foundations", track: dsa },
  {
    slug: "complexity",
    name: "Complexity Analysis",
    track: dsa,
    parent: "dsa-foundations",
    description: "Big-O for time and space, and choosing the approach the input size allows.",
    alsoIn: [{ track: cs, parent: "cs-theory" }],
  },
  {
    slug: "recursion",
    name: "Recursion",
    track: dsa,
    parent: "dsa-foundations",
    description: "Thinking recursively: base cases, the call stack and divide and conquer.",
  },
  {
    slug: "interview-technique",
    name: "Coding Interview Technique",
    track: dsa,
    parent: "dsa-foundations",
    description:
      "Clarifying the problem, talking through approaches and trade-offs, and testing your own code under time.",
  },

  { slug: "linear-structures", name: "Arrays & Lists", track: dsa },
  {
    slug: "arrays-hashing",
    name: "Arrays & Hashing",
    track: dsa,
    parent: "linear-structures",
    description: "Arrays, strings and hash maps: counting, grouping, prefix sums and constant-time lookups.",
  },
  {
    slug: "two-pointers",
    name: "Two Pointers",
    track: dsa,
    parent: "linear-structures",
    description: "Moving two indices through a sequence: pairs, partitions and in-place rewrites.",
  },
  {
    slug: "sliding-window",
    name: "Sliding Window",
    track: dsa,
    parent: "linear-structures",
    description: "A running window over a sequence for longest, shortest and counting questions.",
  },
  {
    slug: "stacks-queues",
    name: "Stacks & Queues",
    track: dsa,
    parent: "linear-structures",
    description: "LIFO and FIFO, monotonic stacks, and matching and evaluation problems.",
  },
  {
    slug: "linked-lists",
    name: "Linked Lists",
    track: dsa,
    parent: "linear-structures",
    description:
      "Pointer manipulation: reversing, merging, and fast and slow pointers for cycles and middles.",
  },

  { slug: "search-sort", name: "Searching & Sorting", track: dsa },
  {
    slug: "binary-search",
    name: "Binary Search",
    track: dsa,
    parent: "search-sort",
    description: "Halving the search space, on sorted input and on the answer itself.",
  },
  {
    slug: "sorting",
    name: "Sorting",
    track: dsa,
    parent: "search-sort",
    description:
      "How merge sort, quicksort and counting sort work, what they cost, and sorting as a first step.",
  },

  { slug: "trees-graphs", name: "Trees & Graphs", track: dsa },
  {
    slug: "trees",
    name: "Trees",
    track: dsa,
    parent: "trees-graphs",
    description: "Binary trees and binary search trees: traversals, depth, paths and recursion over a tree.",
  },
  {
    slug: "tries",
    name: "Tries",
    track: dsa,
    parent: "trees-graphs",
    description: "Prefix trees for word search, autocomplete and prefix counting.",
  },
  {
    slug: "heaps",
    name: "Heaps & Priority Queues",
    track: dsa,
    parent: "trees-graphs",
    description: "Top k, merging sorted streams, running medians and scheduling with a heap.",
  },
  {
    slug: "graphs",
    name: "Graphs",
    track: dsa,
    parent: "trees-graphs",
    description: "Adjacency lists and grids, BFS and DFS, connected components and cycle detection.",
  },
  {
    slug: "advanced-graphs",
    name: "Advanced Graphs",
    track: dsa,
    parent: "trees-graphs",
    description: "Shortest paths, topological sort, union-find and minimum spanning trees.",
  },

  { slug: "techniques", name: "Techniques", track: dsa },
  {
    slug: "backtracking",
    name: "Backtracking",
    track: dsa,
    parent: "techniques",
    description:
      "Exploring choices with pruning: subsets, permutations, combinations and constraint puzzles.",
  },
  {
    slug: "greedy",
    name: "Greedy",
    track: dsa,
    parent: "techniques",
    description: "Taking the locally best choice, and knowing when that is provably right.",
  },
  {
    slug: "intervals",
    name: "Intervals",
    track: dsa,
    parent: "techniques",
    description: "Merging, inserting and scheduling ranges, and counting overlaps.",
  },
  {
    slug: "dynamic-programming",
    name: "Dynamic Programming",
    track: dsa,
    parent: "techniques",
    description: "Overlapping subproblems: designing the state, memoisation and bottom-up tables.",
  },
  {
    slug: "bit-manipulation",
    name: "Bit Manipulation",
    track: dsa,
    parent: "techniques",
    description: "Masks, shifts and XOR tricks for sets, parity and single-number problems.",
  },

  // Computer Science Foundations
  { slug: "computer-systems", name: "Computer Systems", track: cs },
  {
    slug: "memory-management",
    name: "Memory Management",
    track: cs,
    parent: "computer-systems",
    description: "Stack and heap, pointers and references, ownership, and how garbage collection works.",
  },
  {
    slug: "computer-architecture",
    name: "Computer Architecture",
    track: cs,
    parent: "computer-systems",
    description: "CPUs, memory hierarchy, caches and how code becomes instructions.",
  },
  {
    slug: "operating-systems",
    name: "Operating Systems",
    track: cs,
    parent: "computer-systems",
    description: "Processes, threads, memory, file systems and the shell.",
    alsoIn: [{ track: sec, parent: "offensive-security" }],
  },
  {
    slug: "concurrency",
    name: "Concurrency",
    track: cs,
    parent: "computer-systems",
    description: "Threads, locks, races, deadlocks and safe shared state.",
  },

  { slug: "cs-networks", name: "Networks", track: cs },
  {
    slug: "networking",
    name: "Networking Fundamentals",
    track: cs,
    parent: "cs-networks",
    description: "IP, TCP and UDP, ports, routing and what happens to a packet on its way.",
    alsoIn: [{ track: sec, parent: "security-networking" }],
  },
  {
    slug: "dns",
    name: "DNS",
    track: cs,
    parent: "cs-networks",
    description: "How names resolve: records, resolvers, caching and common failures.",
  },

  { slug: "cs-theory", name: "Theory", track: cs },
  {
    slug: "discrete-math",
    name: "Discrete Mathematics",
    track: cs,
    parent: "cs-theory",
    description: "Logic, sets, proofs, combinatorics and graphs as used in computing.",
  },
  {
    slug: "computability",
    name: "Computability",
    track: cs,
    parent: "cs-theory",
    description: "Automata, what can and cannot be computed, and why some problems are hard.",
  },
  {
    slug: "probability",
    name: "Probability",
    track: cs,
    parent: "cs-theory",
    description: "Counting, expected value, conditional probability and randomised algorithms.",
  },
  {
    slug: "compilers",
    name: "Compilers & Interpreters",
    track: cs,
    parent: "cs-theory",
    description: "How source becomes something that runs: parsing, syntax trees, bytecode and optimisation.",
  },
];

/** [skill, requires] pairs: the readiness gate checks these before the planner moves on. */
export const prerequisites: [string, string][] = [
  ["apis", "http"],
  ["authentication", "http"],
  ["caching", "http"],
  ["web-security", "http"],
  ["frontend-fundamentals", "variables-control-flow"],
  ["functions", "variables-control-flow"],
  ["error-handling", "functions"],
  ["async-programming", "functions"],
  ["testing", "functions"],
  ["indexing", "sql"],
  ["transactions", "sql"],
  ["scalability", "caching"],
  ["distributed-systems", "scalability"],
  ["distributed-systems", "networking"],
  ["observability", "architecture"],
  ["ci-cd", "version-control"],
  ["ci-cd", "testing"],
  ["containers", "operating-systems"],

  ["tls", "networking"],
  ["tls", "cryptography"],
  ["network-defense", "networking"],
  ["injection-attacks", "web-security"],
  ["exploitation", "reconnaissance"],
  ["privilege-escalation", "operating-systems"],
  ["incident-response", "detection"],

  ["analytical-sql", "sql"],
  ["exploratory-analysis", "data-cleaning"],
  ["inferential-statistics", "descriptive-statistics"],
  ["experimentation", "inferential-statistics"],
  ["data-storytelling", "data-visualization"],

  ["circuit-analysis", "ohms-law"],
  ["digital-io", "arduino"],
  ["analog-pwm", "digital-io"],
  ["sensors", "analog-pwm"],
  ["motors", "analog-pwm"],
  ["motors", "power"],
  ["serial-protocols", "digital-io"],
  ["iot-connectivity", "serial-protocols"],
  ["iot-connectivity", "networking"],
  ["circuit-debugging", "measurement"],

  ["usability-testing", "user-research"],
  ["prototyping", "user-flows"],
  ["design-systems", "typography"],
  ["design-systems", "layout-hierarchy"],

  ["two-pointers", "arrays-hashing"],
  ["sliding-window", "two-pointers"],
  ["binary-search", "arrays-hashing"],
  ["sorting", "arrays-hashing"],
  ["trees", "recursion"],
  ["tries", "trees"],
  ["heaps", "trees"],
  ["graphs", "trees"],
  ["graphs", "stacks-queues"],
  ["advanced-graphs", "graphs"],
  ["advanced-graphs", "heaps"],
  ["backtracking", "recursion"],
  ["dynamic-programming", "recursion"],
  ["intervals", "sorting"],
  ["greedy", "sorting"],

  ["concurrency", "operating-systems"],
  ["memory-management", "computer-architecture"],
  ["dns", "networking"],
  ["computability", "discrete-math"],
  ["probability", "discrete-math"],
  ["compilers", "discrete-math"],
];
