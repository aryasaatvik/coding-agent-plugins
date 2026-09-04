import { describe, test, expect } from "bun:test";
import { spawn } from "bun";
import { join } from "path";

const CLAUDE_HOOK = join(import.meta.dir, "../claude-code/ni.ts");

describe("Claude Code hook integration", () => {
  async function runHook(input: any): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const proc = spawn({
      cmd: ["bun", "run", CLAUDE_HOOK],
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    // Write input to stdin
    proc.stdin.write(JSON.stringify(input));
    proc.stdin.end();

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return { stdout, stderr, exitCode };
  }

  test("translates npm install to ni", async () => {
    const input = {
      session_id: "test",
      transcript_path: "/tmp/test.jsonl",
      cwd: "/tmp",
      permission_mode: "default",
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: {
        command: "npm install vite",
      },
    };

    const result = await runHook(input);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output.hookSpecificOutput.permissionDecision).toBe("allow");
    expect(output.hookSpecificOutput.updatedInput.command).toBe("ni vite");
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain("Translated:");
  });

  test("passes through non-PM commands", async () => {
    const input = {
      session_id: "test",
      transcript_path: "/tmp/test.jsonl",
      cwd: "/tmp",
      permission_mode: "default",
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: {
        command: "ls -la",
      },
    };

    const result = await runHook(input);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(""); // No output for non-PM commands
  });

  test("ignores non-Bash tools", async () => {
    const input = {
      session_id: "test",
      transcript_path: "/tmp/test.jsonl",
      cwd: "/tmp",
      permission_mode: "default",
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: {
        file_path: "/tmp/test.txt",
        content: "test",
      },
    };

    const result = await runHook(input);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(""); // No output for non-Bash tools
  });

  test("handles yarn run commands", async () => {
    const input = {
      session_id: "test",
      transcript_path: "/tmp/test.jsonl",
      cwd: "/tmp",
      permission_mode: "default",
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: {
        command: "yarn run dev",
      },
    };

    const result = await runHook(input);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output.hookSpecificOutput.updatedInput.command).toBe("nr dev");
  });

  test("handles npx commands", async () => {
    const input = {
      session_id: "test",
      transcript_path: "/tmp/test.jsonl",
      cwd: "/tmp",
      permission_mode: "default",
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: {
        command: "npx vitest",
      },
    };

    const result = await runHook(input);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output.hookSpecificOutput.updatedInput.command).toBe("nlx vitest");
  });

  test("handles global install", async () => {
    const input = {
      session_id: "test",
      transcript_path: "/tmp/test.jsonl",
      cwd: "/tmp",
      permission_mode: "default",
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: {
        command: "npm install -g typescript",
      },
    };

    const result = await runHook(input);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output.hookSpecificOutput.updatedInput.command).toBe(
      "ni -g typescript"
    );
  });

  test("handles yarn shorthand", async () => {
    const input = {
      session_id: "test",
      transcript_path: "/tmp/test.jsonl",
      cwd: "/tmp",
      permission_mode: "default",
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: {
        command: "yarn dev",
      },
    };

    const result = await runHook(input);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output.hookSpecificOutput.updatedInput.command).toBe("nr dev");
  });

  test("output format is correct", async () => {
    const input = {
      session_id: "test",
      transcript_path: "/tmp/test.jsonl",
      cwd: "/tmp",
      permission_mode: "default",
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: {
        command: "npm install",
      },
    };

    const result = await runHook(input);
    const output = JSON.parse(result.stdout);

    // Check required fields
    expect(output).toHaveProperty("hookSpecificOutput");
    expect(output.hookSpecificOutput).toHaveProperty("hookEventName");
    expect(output.hookSpecificOutput).toHaveProperty("permissionDecision");
    expect(output.hookSpecificOutput).toHaveProperty(
      "permissionDecisionReason"
    );
    expect(output.hookSpecificOutput).toHaveProperty("updatedInput");

    // Check values
    expect(output.hookSpecificOutput.hookEventName).toBe("PreToolUse");
    expect(output.hookSpecificOutput.permissionDecision).toBe("allow");
    expect(output.hookSpecificOutput.updatedInput).toHaveProperty("command");
  });

  test("handles invalid JSON input gracefully", async () => {
    const proc = spawn({
      cmd: ["bun", "run", CLAUDE_HOOK],
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    proc.stdin.write("{ invalid json }");
    proc.stdin.end();

    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Error");
  });
});

describe("OpenCode plugin integration", () => {
  async function loadPlugin() {
    const module = await import("../opencode/ni-plugin.ts");
    const plugin = module.default as {
      id: string;
      setup: (ctx: {
        location: { directory: string };
        tool: {
          hook: (
            name: "execute.before",
            callback: (event: { tool: string; input: unknown }) => Promise<void> | void,
          ) => Promise<{ dispose: () => Promise<void> }>;
        };
      }) => Promise<() => Promise<void>>;
    };

    let handler: ((event: { tool: string; input: unknown }) => Promise<void> | void) | undefined;
    const cleanup = await plugin.setup({
      location: { directory: "/tmp" },
      tool: {
        hook: async (_name, callback) => {
          handler = callback;
          return { dispose: async () => {} };
        },
      },
    });

    if (!handler) {
      throw new Error("plugin did not register execute.before");
    }

    return { plugin, handler, cleanup };
  }

  test("plugin exports a V2 default definition", async () => {
    const module = await import("../opencode/ni-plugin.ts");
    expect(module.default).toMatchObject({ id: "ni-plugin" });
    expect(typeof module.default.setup).toBe("function");
  });

  test("plugin modifies shell commands", async () => {
    const { handler, cleanup } = await loadPlugin();
    const input = { command: "npm install vite" };
    await handler({ tool: "shell", input });
    expect(input.command).toBe("ni vite");
    await cleanup();
  });

  test("plugin passes through non-shell commands", async () => {
    const { handler, cleanup } = await loadPlugin();
    const input = { filePath: "/tmp/test.txt" };
    await handler({ tool: "read", input });
    expect(input).toEqual({ filePath: "/tmp/test.txt" });
    await cleanup();
  });

  test("plugin passes through non-PM shell commands", async () => {
    const { handler, cleanup } = await loadPlugin();
    const input = { command: "ls -la" };
    await handler({ tool: "shell", input });
    expect(input.command).toBe("ls -la");
    await cleanup();
  });
});
