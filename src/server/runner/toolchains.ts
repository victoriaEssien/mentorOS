import type { CodeLanguage } from "@/lib/code-languages";

/**
 * How each language is built and run inside the sandbox. The snapshot (scripts/build-runner-snapshot.ts)
 * installs exactly these toolchains; change both together.
 */
export type Toolchain = {
  /** The file the learner's code is written to. Java needs its class to be called Main. */
  file: string;
  compile: string[] | null;
  run: string[];
};

export const TOOLCHAINS: Record<CodeLanguage, Toolchain> = {
  python: { file: "main.py", compile: null, run: ["python3", "main.py"] },
  // Node runs TypeScript directly; transform-types also allows enums and namespaces.
  typescript: {
    file: "main.ts",
    compile: null,
    run: ["node", "--experimental-transform-types", "--no-warnings", "main.ts"],
  },
  go: { file: "main.go", compile: ["go", "build", "-o", "main", "main.go"], run: ["./main"] },
  rust: {
    file: "main.rs",
    compile: ["rustc", "-O", "--edition", "2021", "-o", "main", "main.rs"],
    run: ["./main"],
  },
  cpp: { file: "main.cpp", compile: ["g++", "-O2", "-std=c++20", "-o", "main", "main.cpp"], run: ["./main"] },
  java: { file: "Main.java", compile: ["javac", "Main.java"], run: ["java", "-Xss64m", "Main"] },
};

/** Where the runner works inside the sandbox. Go's build cache is warmed here when the snapshot is built. */
export const WORK_DIR = "/vercel/sandbox/run";
export const GO_CACHE = "/vercel/sandbox/.gocache";

/**
 * Runs inside the sandbox: compiles once, then runs every case with its input on stdin and a time
 * limit, and prints one JSON object. Output is capped so a runaway print can't flood the response.
 */
export const JUDGE_SCRIPT = String.raw`
import json, subprocess, time

spec = json.load(open("spec.json"))
CAP = 16384

def clip(data):
    text = (data or b"").decode("utf-8", "replace")
    return text if len(text) <= CAP else text[:CAP] + "\n[output cut at 16 KB]"

out = {"compileError": None, "cases": []}
if spec["compile"]:
    try:
        built = subprocess.run(spec["compile"], capture_output=True, timeout=spec["compileSeconds"])
        if built.returncode != 0:
            out["compileError"] = clip(built.stderr + built.stdout) or "The build failed."
    except subprocess.TimeoutExpired:
        out["compileError"] = "The build took too long."

if out["compileError"] is None:
    for case in spec["cases"]:
        started = time.monotonic()
        try:
            ran = subprocess.run(spec["run"], input=case.encode(), capture_output=True, timeout=spec["runSeconds"])
            result = {"stdout": clip(ran.stdout), "stderr": clip(ran.stderr), "exitCode": ran.returncode, "timedOut": False}
        except subprocess.TimeoutExpired as expired:
            result = {"stdout": clip(expired.stdout), "stderr": clip(expired.stderr), "exitCode": None, "timedOut": True}
        result["ms"] = round((time.monotonic() - started) * 1000)
        out["cases"].append(result)

print(json.dumps(out))
`;
