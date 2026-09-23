import { describe, expect, test } from "bun:test";
import { spawn } from "bun";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOOK = join(import.meta.dir, "../hooks/session-title-hook.js");

async function runHook(
  dataDir: string,
  prompt: string,
  transcriptPath = "/nonexistent.jsonl",
) {
  const proc = spawn({
    cmd: ["bun", HOOK],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, CLAUDE_PLUGIN_DATA: dataDir },
  });
  proc.stdin.write(
    JSON.stringify({
      session_id: "session-1",
      transcript_path: transcriptPath,
      cwd: "/tmp",
      hook_event_name: "UserPromptSubmit",
      prompt,
    }),
  );
  proc.stdin.end();
  const stdout = await Bun.readableStreamToText(proc.stdout);
  const exitCode = await proc.exited;
  return { exitCode, output: stdout.trim() ? JSON.parse(stdout) : undefined };
}

describe("session-title hook", () => {
  test("ordinary prompts pass through when nothing is pending", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "session-title-"));
    const { exitCode, output } = await runHook(dataDir, "hello");
    expect(exitCode).toBe(0);
    expect(output).toBeUndefined();
  });

  test("/title blocks the prompt and starts the generator", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "session-title-"));
    const { exitCode, output } = await runHook(dataDir, "/title");
    expect(exitCode).toBe(0);
    expect(output.decision).toBe("block");
    expect(output.reason).toContain("next message");

    // The generator fails on the missing transcript and records why.
    const log = join(dataDir, "errors.log");
    for (let attempt = 0; attempt < 50 && !existsSync(log); attempt++) {
      await Bun.sleep(100);
    }
    expect(await Bun.file(log).text()).toContain("/nonexistent.jsonl");
  });

  test("the next prompt applies a pending title once", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "session-title-"));
    await Bun.write(
      join(dataDir, "session-1.title"),
      "dotfiles: review skills\n",
    );

    const first = await runHook(dataDir, "next message");
    expect(first.output).toEqual({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        sessionTitle: "dotfiles: review skills",
      },
    });
    expect(existsSync(join(dataDir, "session-1.title"))).toBe(false);

    const second = await runHook(dataDir, "another message");
    expect(second.output).toBeUndefined();
  });
});
