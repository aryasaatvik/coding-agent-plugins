import { describe, test, expect, beforeAll } from "bun:test";
import { spawn } from "bun";
import { join } from "path";
import { existsSync, copyFileSync } from "fs";

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
  const isWindows = process.platform === "win32";
  const OPENCODE_EXECUTABLE = join(import.meta.dir, "../opencode/ni" + (isWindows ? ".exe" : ""));

  beforeAll(async () => {
    // Build the executable if it doesn't exist
    if (!existsSync(OPENCODE_EXECUTABLE)) {
      console.log("Building ni executable for OpenCode tests...");

      // Don't add .exe to outfile on Windows - Bun adds it automatically
      const outfile = join(import.meta.dir, "../opencode/ni");

      const buildProc = spawn({
        cmd: ["bun", "build", join(import.meta.dir, "../claude-code/ni.ts"), "--compile", "--outfile", outfile],
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await buildProc.exited;

      if (exitCode !== 0) {
        const stderr = await new Response(buildProc.stderr).text();
        throw new Error(`Failed to build executable: ${stderr}`);
      }

      console.log("✓ Executable built successfully");
    }
  });

  test("plugin exports correct structure", async () => {
    const module = await import("../opencode/ni-plugin.ts");

    expect(module).toHaveProperty("NiPlugin");
    expect(typeof module.NiPlugin).toBe("function");
  });

  test("plugin initializes correctly", async () => {
    const { NiPlugin } = await import("../opencode/ni-plugin.ts");

    const plugin = await NiPlugin({
      project: "test-project",
      directory: "/tmp",
      worktree: "/tmp",
      client: {} as any,
      $: {} as any,
    });

    expect("tool.execute.before" in plugin).toBe(true);
    expect(typeof plugin["tool.execute.before"]).toBe("function");
  });

  test("plugin modifies bash commands", async () => {
    const { NiPlugin } = await import("../opencode/ni-plugin.ts");

    const plugin = await NiPlugin({
      project: "test-project",
      directory: "/tmp",
      worktree: "/tmp",
      client: {} as any,
      $: {} as any,
    });

    const input = {
      tool: "bash",
    };

    const output = {
      args: {
        command: "npm install vite",
      },
    };

    await plugin["tool.execute.before"]!(input, output);

    expect(output.args.command).toBe("ni vite");
  });

  test("plugin passes through non-bash commands", async () => {
    const { NiPlugin } = await import("../opencode/ni-plugin.ts");

    const plugin = await NiPlugin({
      project: "test-project",
      directory: "/tmp",
      worktree: "/tmp",
      client: {} as any,
      $: {} as any,
    });

    const input = {
      tool: "read",
    };

    const output = {
      args: {
        filePath: "/tmp/test.txt",
      },
    };

    await plugin["tool.execute.before"]!(input, output);

    // Should not modify non-bash commands
    expect(output).toEqual({
      args: {
        filePath: "/tmp/test.txt",
      },
    });
  });

  test("plugin passes through non-PM bash commands", async () => {
    const { NiPlugin } = await import("../opencode/ni-plugin.ts");

    const plugin = await NiPlugin({
      project: "test-project",
      directory: "/tmp",
      worktree: "/tmp",
      client: {} as any,
      $: {} as any,
    });

    const input = {
      tool: "bash",
    };

    const output = {
      args: {
        command: "ls -la",
      },
    };

    await plugin["tool.execute.before"]!(input, output);

    // Should not modify non-PM commands
    expect(output.args.command).toBe("ls -la");
  });
});
