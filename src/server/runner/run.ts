import "server-only";
import { Sandbox } from "@vercel/sandbox";

import { sameOutput, type CodeLanguage, type TestCase } from "@/lib/code-languages";
import { env } from "@/lib/env";

import { GO_CACHE, JUDGE_SCRIPT, TOOLCHAINS, WORK_DIR } from "./toolchains";

/**
 * Runs learner code against test cases in a Vercel Sandbox: a fresh microVM per run, started from
 * the toolchain snapshot, with no network, stopped as soon as the results are in. Nothing here
 * writes learner state.
 */

/** No snapshot configured, or the sandbox couldn't start. Running code is off until it's fixed. */
export class RunnerUnavailableError extends Error {
  constructor(reason: string) {
    super(`Code runner unavailable: ${reason}`);
    this.name = "RunnerUnavailableError";
  }
}

export type CaseResult = {
  passed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  ms: number;
};

export type RunOutcome = { compileError: string | null; cases: CaseResult[] };

type JudgeOutput = {
  compileError: string | null;
  cases: Omit<CaseResult, "passed">[];
};

export const runnerConfigured = () => Boolean(env.CODE_RUNNER_SNAPSHOT_ID);

/** Compiles the code once and runs it on each test's input, judging the output. */
export async function runTests(
  language: CodeLanguage,
  code: string,
  tests: TestCase[],
  { runSeconds = 2 }: { runSeconds?: number } = {},
): Promise<RunOutcome> {
  const judged = await judge(
    language,
    code,
    tests.map((test) => test.input),
    runSeconds,
  );
  return {
    compileError: judged.compileError,
    cases: judged.cases.map((result, index) => ({
      ...result,
      passed: !result.timedOut && result.exitCode === 0 && sameOutput(result.stdout, tests[index]!.output),
    })),
  };
}

/** Runs the code on one input and returns what it printed: how "predict the output" answers are made. */
export async function runOnce(
  language: CodeLanguage,
  code: string,
  input = "",
): Promise<{ compileError: string | null; result: Omit<CaseResult, "passed"> | null }> {
  const judged = await judge(language, code, [input], 5);
  return { compileError: judged.compileError, result: judged.cases[0] ?? null };
}

async function judge(language: CodeLanguage, code: string, inputs: string[], runSeconds: number) {
  if (!env.CODE_RUNNER_SNAPSHOT_ID) throw new RunnerUnavailableError("no snapshot configured");
  const toolchain = TOOLCHAINS[language];
  const started = performance.now();

  let sandbox: Sandbox;
  try {
    sandbox = await Sandbox.create({
      source: { type: "snapshot", snapshotId: env.CODE_RUNNER_SNAPSHOT_ID },
      resources: { vcpus: 2 },
      timeout: 120_000,
      networkPolicy: "deny-all",
      // A run leaves nothing worth keeping, and saved snapshots count against storage.
      persistent: false,
      ...credentials(),
    });
  } catch (error) {
    throw new RunnerUnavailableError(String(error));
  }

  try {
    await sandbox.writeFiles([
      { path: `${WORK_DIR}/${toolchain.file}`, content: code },
      { path: `${WORK_DIR}/judge.py`, content: JUDGE_SCRIPT },
      {
        path: `${WORK_DIR}/spec.json`,
        content: JSON.stringify({
          compile: toolchain.compile,
          run: toolchain.run,
          cases: inputs,
          compileSeconds: 60,
          runSeconds,
        }),
      },
    ]);
    const finished = await sandbox.runCommand({
      cmd: "python3",
      args: ["judge.py"],
      cwd: WORK_DIR,
      env: { GOCACHE: GO_CACHE },
      timeoutMs: 100_000,
    });
    const stdout = await finished.stdout();
    if (finished.exitCode !== 0) {
      throw new Error(`judge exited ${finished.exitCode}: ${(await finished.stderr()).slice(0, 500)}`);
    }
    const output = JSON.parse(stdout) as JudgeOutput;
    console.info(
      JSON.stringify({
        event: "runner.ran",
        language,
        cases: inputs.length,
        compiled: output.compileError === null,
        ms: Math.round(performance.now() - started),
      }),
    );
    return output;
  } finally {
    await sandbox.stop().catch(() => {});
  }
}

/** A personal token where one is set (local development); on Vercel the deployment's OIDC token. */
function credentials() {
  const { VERCEL_TOKEN: token, VERCEL_TEAM_ID: teamId, VERCEL_PROJECT_ID: projectId } = env;
  return token && teamId && projectId ? { token, teamId, projectId } : {};
}
