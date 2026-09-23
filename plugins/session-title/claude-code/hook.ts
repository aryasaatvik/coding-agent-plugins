#!/usr/bin/env bun

/**
 * session-title UserPromptSubmit hook for Claude Code
 *
 * `/title` starts title generation in a detached process and blocks the prompt,
 * so it returns immediately without a model turn. A blocked prompt cannot set
 * the title, so the generated title waits in a pending file until the next
 * prompt, where this hook applies it through `sessionTitle`.
 */

import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isTitleCommand } from "../shared/title";

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  prompt: string;
}

const input: HookInput = JSON.parse(await Bun.stdin.text());
const dataDir =
  process.env.CLAUDE_PLUGIN_DATA ??
  join(homedir(), ".cache", "claude-session-title");
const pendingFile = join(dataDir, `${input.session_id}.title`);

if (isTitleCommand(input.prompt)) {
  mkdirSync(dataDir, { recursive: true });
  const generator = spawn(
    process.execPath,
    [
      join(import.meta.dir, "generate.js"),
      input.transcript_path,
      input.cwd,
      pendingFile,
    ],
    { detached: true, stdio: "ignore" },
  );
  generator.unref();

  console.log(
    JSON.stringify({
      decision: "block",
      reason: "Generating a session title; it applies with your next message.",
    }),
  );
  process.exit(0);
}

const pending = Bun.file(pendingFile);
if (await pending.exists()) {
  const title = (await pending.text()).trim();
  rmSync(pendingFile, { force: true });
  if (title) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          sessionTitle: title,
        },
      }),
    );
  }
}
