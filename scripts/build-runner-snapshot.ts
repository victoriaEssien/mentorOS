/**
 * Builds the code runner's snapshot: a sandbox with every toolchain installed and warmed, saved so
 * each run starts ready. Run it again after changing src/server/runner/toolchains.ts, then set
 * CODE_RUNNER_SNAPSHOT_ID to the id it prints, locally and on Vercel.
 *
 *   pnpm exec tsx scripts/build-runner-snapshot.ts
 *
 * Needs VERCEL_TOKEN, VERCEL_TEAM_ID and VERCEL_PROJECT_ID in .env.local. Takes a few minutes.
 */
import { config } from "dotenv";

import { Sandbox } from "@vercel/sandbox";

import { GO_CACHE, TOOLCHAINS, WORK_DIR } from "../src/server/runner/toolchains";

config({ path: ".env.local", quiet: true });

const HELLO: Record<keyof typeof TOOLCHAINS, string> = {
  python: 'print("ok")\n',
  typescript: 'const greeting: string = "ok";\nconsole.log(greeting);\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() { fmt.Println("ok") }\n',
  rust: 'fn main() { println!("ok"); }\n',
  cpp: '#include <iostream>\nint main() { std::cout << "ok\\n"; }\n',
  java: 'public class Main { public static void main(String[] a) { System.out.println("ok"); } }\n',
};

async function main() {
  const { VERCEL_TOKEN: token, VERCEL_TEAM_ID: teamId, VERCEL_PROJECT_ID: projectId } = process.env;
  if (!token || !teamId || !projectId) {
    throw new Error("Set VERCEL_TOKEN, VERCEL_TEAM_ID and VERCEL_PROJECT_ID in .env.local first.");
  }

  const sandbox = await Sandbox.create({
    image: "vercel/sandbox/universal",
    resources: { vcpus: 4 },
    timeout: 30 * 60_000,
    persistent: false,
    token,
    teamId,
    projectId,
  });
  console.log(`Sandbox ${sandbox.name} started.`);

  const sh = async (script: string, sudo = false) => {
    const done = await sandbox.runCommand({
      cmd: "bash",
      args: ["-lc", script],
      sudo,
      env: { GOCACHE: GO_CACHE },
    });
    const out = (await done.output("both")).trim();
    if (done.exitCode !== 0) throw new Error(`Failed (${done.exitCode}): ${script}\n${out.slice(-2000)}`);
    return out;
  };

  try {
    console.log("Installing Go, Rust, C++ and Java...");
    await sh(
      "export DEBIAN_FRONTEND=noninteractive && apt-get update -q && apt-get install -y -q --no-install-recommends golang-go rustc g++ default-jdk-headless && apt-get clean",
      true,
    );
    console.log(
      await sh(
        "go version; rustc --version; g++ --version | head -1; javac -version 2>&1; node --version; python3 --version",
      ),
    );

    // Build and run hello world in each language, which also warms Go's standard library cache.
    await sh(`mkdir -p ${WORK_DIR} ${GO_CACHE}`);
    for (const [language, toolchain] of Object.entries(TOOLCHAINS)) {
      await sandbox.writeFiles([
        { path: `${WORK_DIR}/${toolchain.file}`, content: HELLO[language as keyof typeof TOOLCHAINS] },
      ]);
      const steps = [toolchain.compile, toolchain.run].filter(Boolean).map((cmd) => cmd!.join(" "));
      const printed = await sh(`cd ${WORK_DIR} && ${steps.join(" && ")}`);
      if (!printed.endsWith("ok")) throw new Error(`${language} printed ${JSON.stringify(printed)}`);
      console.log(`${language}: ok`);
    }
    await sh(`rm -rf ${WORK_DIR}/*`);

    const snapshot = await sandbox.snapshot({ expiration: 0 });
    console.log(
      `\nSnapshot ready. Set this locally and on Vercel:\nCODE_RUNNER_SNAPSHOT_ID=${snapshot.snapshotId}`,
    );
  } catch (error) {
    await sandbox.stop().catch(() => {});
    throw error;
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(String(error));
    process.exit(1);
  },
);
