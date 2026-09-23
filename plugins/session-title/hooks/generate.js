#!/usr/bin/env bun
// @bun

// claude-code/generate.ts
import { appendFileSync, renameSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";

// shared/title.ts
var TITLE_INSTRUCTION = `Generate a short title for a coding session from the conversation below.
- 3 to 7 words naming what the session is working on now; weight the most recent messages over earlier ones
- no quotes, no trailing punctuation`;
var PLAIN_INSTRUCTION = `Output exactly one line: the title, lowercase, no extra text.`;
var CATEGORY_INSTRUCTION = `Output exactly one line: category: title
- category: a short lowercase slug naming the topic area, as if it were a folder or repository name (e.g. opencode, neovim, taxes). Not a filesystem path.
- title: the session title per the rules above
- entire line lowercase
- no quotes or extra text`;
var RECENT_BUDGET = 12000;
var FIRST_PROMPT_BUDGET = 1500;
function extractTurns(jsonl) {
  const turns = [];
  for (const line of jsonl.split(`
`)) {
    if (!line.trim())
      continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type !== "user" && entry.type !== "assistant")
      continue;
    if (entry.isMeta || entry.isSidechain)
      continue;
    const content = entry.message?.content;
    const parts = typeof content === "string" ? [content] : (content ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "");
    const text = parts.map((part) => part.trim()).filter((part) => part && !part.startsWith("<")).join(`
`);
    if (text)
      turns.push({ role: entry.type, text });
  }
  return turns;
}
function renderConversation(turns) {
  const first = turns.find((turn) => turn.role === "user");
  const lines = [];
  let used = 0;
  for (let index = turns.length - 1;index >= 0; index--) {
    const turn = turns[index];
    if (turn === first)
      break;
    const line = `${label(turn)}: ${turn.text}`;
    if (used + line.length > RECENT_BUDGET) {
      if (lines.length === 0)
        lines.unshift(line.slice(-RECENT_BUDGET));
      break;
    }
    lines.unshift(line);
    used += line.length;
  }
  if (first)
    lines.unshift(`${label(first)}: ${first.text.slice(0, FIRST_PROMPT_BUDGET)}`);
  return lines.join(`

`);
}
function label(turn) {
  return turn.role === "user" ? "User" : "Assistant";
}
function composePrompt(conversation, categorize) {
  return [
    TITLE_INSTRUCTION,
    categorize ? CATEGORY_INSTRUCTION : PLAIN_INSTRUCTION,
    "Conversation:",
    conversation
  ].join(`

`);
}
function firstLine(generated) {
  return generated.split(`
`).map((item) => item.trim().replace(/^["'`]+|["'`]+$/g, "")).find((item) => item.length > 0);
}
function formatTitle(prefix, generated) {
  const line = firstLine(generated);
  if (!line)
    return;
  const title = stripLeadingPrefix(prefix, line);
  if (!title)
    return;
  return `${prefix}: ${title}`.toLowerCase();
}
function stripLeadingPrefix(prefix, line) {
  const lower = line.toLowerCase();
  const head = prefix.toLowerCase();
  if (lower === head)
    return "";
  if (lower.startsWith(`${head}:`))
    return line.slice(head.length + 1).trim();
  if (lower.startsWith(`${head} `))
    return line.slice(head.length).trim();
  return line;
}
function formatCategorized(generated) {
  const line = firstLine(generated);
  if (!line)
    return;
  return line.toLowerCase();
}
function repositoryName(gitCommonDir) {
  const parts = gitCommonDir.trim().replace(/\/+$/, "").split("/").filter(Boolean);
  const last = parts.at(-1);
  if (!last)
    return;
  if (last === ".git")
    return parts.at(-2);
  return last.replace(/\.git$/, "") || undefined;
}

// claude-code/generate.ts
var MODEL = "openai/gpt-6-luna";
var TIMEOUT_MS = 60000;
var [transcriptPath, cwd, pendingFile] = process.argv.slice(2);
if (!transcriptPath || !cwd || !pendingFile) {
  throw new Error("usage: generate.js <transcript_path> <cwd> <pending_file>");
}
try {
  const turns = extractTurns(await Bun.file(transcriptPath).text());
  if (turns.length === 0)
    throw new Error("transcript has no conversation yet");
  const prefix = gitRepositoryName(cwd);
  const prompt = composePrompt(renderConversation(turns), prefix === undefined);
  const result = Bun.spawnSync([
    "opencode",
    "run",
    "--agent",
    "title",
    "-m",
    MODEL,
    "--title",
    "claude-code session title",
    prompt
  ], { cwd: tmpdir(), stdin: "ignore", stderr: "pipe", timeout: TIMEOUT_MS });
  if (!result.success) {
    throw new Error(`opencode run exited ${result.exitCode}: ${result.stderr.toString().trim().slice(-500)}`);
  }
  const generated = result.stdout.toString();
  const title = prefix === undefined ? formatCategorized(generated) : formatTitle(prefix, generated);
  if (!title)
    throw new Error(`no title in model output: ${JSON.stringify(generated)}`);
  const temporary = `${pendingFile}.${process.pid}.tmp`;
  await Bun.write(temporary, title);
  renameSync(temporary, pendingFile);
} catch (error) {
  appendFileSync(join(dirname(pendingFile), "errors.log"), `${new Date().toISOString()} ${transcriptPath}: ${error instanceof Error ? error.message : String(error)}
`);
  process.exit(1);
}
function gitRepositoryName(directory) {
  const result = Bun.spawnSync([
    "git",
    "-C",
    directory,
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir"
  ], { stdin: "ignore", stderr: "ignore" });
  if (!result.success)
    return;
  return repositoryName(result.stdout.toString());
}
