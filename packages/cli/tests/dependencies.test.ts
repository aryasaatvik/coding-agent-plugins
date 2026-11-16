/**
 * Dependency check regression tests.
 *
 * Each case runs the real `checkDependencies` in a subprocess whose PATH is a
 * fixture directory, so `which` resolves only the commands the case provides.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { InstallOptions, PlatformInfo } from "../src/shared/types";

const detectorPath = join(import.meta.dir, "..", "src", "shared", "detector.ts");
const whichPath = Bun.which("which");
if (!whichPath) {
  throw new Error("`which` is required to run the dependency check tests");
}
const truePath = Bun.which("true") ?? "/usr/bin/true";

const root = mkdtempSync(join(tmpdir(), "cli-dependencies-"));
const runnerPath = join(root, "runner.ts");

writeFileSync(
  runnerPath,
  `import { checkDependencies } from ${JSON.stringify(detectorPath)};

const platforms = JSON.parse(process.argv[2]!) as PlatformInfo;
const options = JSON.parse(process.argv[3]!) as InstallOptions;
console.log(JSON.stringify(await checkDependencies(platforms, options)));
`,
);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const bothDetected: PlatformInfo = {
  claudeCode: { detected: true },
  openCode: { detected: true },
};

/** A PATH containing `which` plus symlinks for the named commands. */
function fixture(name: string, commands: string[]): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  symlinkSync(whichPath!, join(dir, "which"));
  for (const command of commands) {
    symlinkSync(truePath, join(dir, command));
  }
  return dir;
}

async function check(
  platforms: PlatformInfo,
  options: InstallOptions,
  pathDir: string,
): Promise<{ jq: boolean; bun: boolean }> {
  const proc = Bun.spawn(
    [process.execPath, runnerPath, JSON.stringify(platforms), JSON.stringify(options)],
    { env: { PATH: pathDir }, stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    Bun.readableStreamToText(proc.stdout),
    Bun.readableStreamToText(proc.stderr),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`dependency runner failed (${exitCode}): ${stderr}`);
  }
  return JSON.parse(stdout.trim());
}

describe("checkDependencies", () => {
  test("succeeds without jq when only OpenCode is selected", async () => {
    const path = fixture("opencode-only", ["bun"]);

    const deps = await check(bothDetected, { opencodeOnly: true }, path);

    expect(deps).toEqual({ jq: true, bun: true });
  });

  test("requires jq by default when Claude Code is detected", async () => {
    const path = fixture("default", ["bun"]);

    const deps = await check(bothDetected, {}, path);

    expect(deps).toEqual({ jq: false, bun: true });
  });

  test("requires jq with --claude-only", async () => {
    const path = fixture("claude-only", ["bun"]);

    const deps = await check(bothDetected, { claudeOnly: true }, path);

    expect(deps).toEqual({ jq: false, bun: true });
  });

  test("requires bun even when jq is not needed", async () => {
    const path = fixture("no-bun", ["jq"]);

    const deps = await check(bothDetected, { opencodeOnly: true }, path);

    expect(deps).toEqual({ jq: true, bun: false });
  });

  test("succeeds when both dependencies are present", async () => {
    const path = fixture("all-present", ["jq", "bun"]);

    const deps = await check(bothDetected, {}, path);

    expect(deps).toEqual({ jq: true, bun: true });
  });
});
