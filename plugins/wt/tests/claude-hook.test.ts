import { describe, test, expect } from "bun:test";
import { spawn } from "bun";
import { join } from "path";

const CLAUDE_HOOK = join(import.meta.dir, "../claude-code/wt.ts");

async function runHook(toolName: string, toolInput: Record<string, unknown>) {
  const proc = spawn({
    cmd: ["bun", "run", CLAUDE_HOOK],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(
    JSON.stringify({
      session_id: "test",
      transcript_path: "/tmp/test.jsonl",
      cwd: "/tmp",
      permission_mode: "default",
      hook_event_name: "PreToolUse",
      tool_name: toolName,
      tool_input: toolInput,
    })
  );
  proc.stdin.end();
  const stdout = await Bun.readableStreamToText(proc.stdout);
  const exitCode = await proc.exited;
  return { exitCode, output: stdout.trim() ? JSON.parse(stdout) : undefined };
}

describe("Claude Code hook", () => {
  test("denies git -C <repo> worktree add", async () => {
    const { exitCode, output } = await runHook("Bash", {
      command: "git -C ~/Developer/repo worktree add -b feat ../feat main",
    });
    expect(exitCode).toBe(0);
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain("wt new feat main");
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain("EnterWorktree `path`");
    expect(output.systemMessage).toBeUndefined();
  });

  test("passes through other Bash commands", async () => {
    const { exitCode, output } = await runHook("Bash", { command: "git worktree list" });
    expect(exitCode).toBe(0);
    expect(output).toBeUndefined();
  });

  test("denies EnterWorktree with name", async () => {
    const { output } = await runHook("EnterWorktree", { name: "feat" });
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain("wt new feat");
  });

  test("denies EnterWorktree with neither name nor path", async () => {
    const { output } = await runHook("EnterWorktree", {});
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain("wt new <branch> [base]");
  });

  test("allows EnterWorktree with path", async () => {
    const { exitCode, output } = await runHook("EnterWorktree", {
      path: "/Users/me/Developer/repo-worktrees/feat",
    });
    expect(exitCode).toBe(0);
    expect(output).toBeUndefined();
  });

  test("denies Agent with isolation: worktree", async () => {
    const { output } = await runHook("Agent", {
      prompt: "do the thing",
      isolation: "worktree",
    });
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain("cd");
  });

  test("allows Agent without worktree isolation", async () => {
    for (const input of [{ prompt: "x" }, { prompt: "x", isolation: "remote" }]) {
      const { output } = await runHook("Agent", input);
      expect(output).toBeUndefined();
    }
  });
});
