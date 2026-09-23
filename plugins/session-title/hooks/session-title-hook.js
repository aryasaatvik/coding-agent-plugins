#!/usr/bin/env bun
// @bun

// claude-code/hook.ts
import { spawn } from "child_process";
import { mkdirSync, rmSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// shared/title.ts
function isTitleCommand(prompt) {
  return /^\/(session-title:)?title$/.test(prompt.trim());
}

// claude-code/hook.ts
var input = JSON.parse(await Bun.stdin.text());
var dataDir = process.env.CLAUDE_PLUGIN_DATA ?? join(homedir(), ".cache", "claude-session-title");
var pendingFile = join(dataDir, `${input.session_id}.title`);
if (isTitleCommand(input.prompt)) {
  mkdirSync(dataDir, { recursive: true });
  const generator = spawn(process.execPath, [
    join(import.meta.dir, "generate.js"),
    input.transcript_path,
    input.cwd,
    pendingFile
  ], { detached: true, stdio: "ignore" });
  generator.unref();
  console.log(JSON.stringify({
    decision: "block",
    reason: "Generating a session title; it applies with your next message."
  }));
  process.exit(0);
}
var pending = Bun.file(pendingFile);
if (await pending.exists()) {
  const title = (await pending.text()).trim();
  rmSync(pendingFile, { force: true });
  if (title) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        sessionTitle: title
      }
    }));
  }
}
