#!/usr/bin/env bun

/**
 * Detached title generator for session-title.
 *
 * Usage: generate.js <transcript_path> <cwd> <pending_file>
 *
 * Reads the Claude Code transcript, asks OpenCode's `title` agent for a title,
 * and writes it to the pending file for the next UserPromptSubmit to apply.
 * Failures are appended to `errors.log` next to the pending file.
 */

import { appendFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  composePrompt,
  extractTurns,
  formatCategorized,
  formatTitle,
  renderConversation,
  repositoryName,
} from "../shared/title";

const MODEL = "openai/gpt-6-luna";
const TIMEOUT_MS = 60_000;

const [transcriptPath, cwd, pendingFile] = process.argv.slice(2);
if (!transcriptPath || !cwd || !pendingFile) {
  throw new Error("usage: generate.js <transcript_path> <cwd> <pending_file>");
}

try {
  const turns = extractTurns(await Bun.file(transcriptPath).text());
  if (turns.length === 0) throw new Error("transcript has no conversation yet");

  const prefix = gitRepositoryName(cwd);
  const prompt = composePrompt(renderConversation(turns), prefix === undefined);

  // Run outside the project so OpenCode loads no project instructions, and name
  // the run so OpenCode skips generating a title for it.
  const result = Bun.spawnSync(
    [
      "opencode",
      "run",
      "--agent",
      "title",
      "-m",
      MODEL,
      "--title",
      "claude-code session title",
      prompt,
    ],
    { cwd: tmpdir(), stdin: "ignore", stderr: "pipe", timeout: TIMEOUT_MS },
  );
  if (!result.success) {
    throw new Error(
      `opencode run exited ${result.exitCode}: ${result.stderr.toString().trim().slice(-500)}`,
    );
  }

  const generated = result.stdout.toString();
  const title =
    prefix === undefined
      ? formatCategorized(generated)
      : formatTitle(prefix, generated);
  if (!title)
    throw new Error(`no title in model output: ${JSON.stringify(generated)}`);

  const temporary = `${pendingFile}.${process.pid}.tmp`;
  await Bun.write(temporary, title);
  renameSync(temporary, pendingFile);
} catch (error) {
  appendFileSync(
    join(dirname(pendingFile), "errors.log"),
    `${new Date().toISOString()} ${transcriptPath}: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
}

function gitRepositoryName(directory: string) {
  const result = Bun.spawnSync(
    [
      "git",
      "-C",
      directory,
      "rev-parse",
      "--path-format=absolute",
      "--git-common-dir",
    ],
    { stdin: "ignore", stderr: "ignore" },
  );
  if (!result.success) return;
  return repositoryName(result.stdout.toString());
}
