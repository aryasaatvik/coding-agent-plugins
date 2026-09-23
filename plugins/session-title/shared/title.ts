/**
 * Transcript extraction, prompt composition, and title formatting for
 * session-title. Mirrors the OpenCode session-title plugin: `repo: title`
 * inside a repository, `category: title` outside one, all lowercase.
 */

export const TITLE_INSTRUCTION = `Generate a short title for a coding session from the conversation below.
- 3 to 7 words naming what the session is working on now; weight the most recent messages over earlier ones
- no quotes, no trailing punctuation`;

export const PLAIN_INSTRUCTION = `Output exactly one line: the title, lowercase, no extra text.`;

export const CATEGORY_INSTRUCTION = `Output exactly one line: category: title
- category: a short lowercase slug naming the topic area, as if it were a folder or repository name (e.g. opencode, neovim, taxes). Not a filesystem path.
- title: the session title per the rules above
- entire line lowercase
- no quotes or extra text`;

/** Characters of recent conversation sent to the model. */
const RECENT_BUDGET = 12_000;
/** Characters of the first user prompt kept for context. */
const FIRST_PROMPT_BUDGET = 1_500;

export interface Turn {
  role: "user" | "assistant";
  text: string;
}

interface TranscriptEntry {
  type?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
}

/**
 * Pull user prompts and assistant replies out of a Claude Code transcript
 * (JSONL). Tool calls, tool results, thinking, meta entries, sidechains, and
 * harness wrappers such as `<command-name>` are skipped.
 */
export function extractTurns(jsonl: string): Turn[] {
  const turns: Turn[] = [];
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    let entry: TranscriptEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type !== "user" && entry.type !== "assistant") continue;
    if (entry.isMeta || entry.isSidechain) continue;

    const content = entry.message?.content;
    const parts =
      typeof content === "string"
        ? [content]
        : (content ?? [])
            .filter((part) => part.type === "text")
            .map((part) => part.text ?? "");
    const text = parts
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith("<"))
      .join("\n");
    if (text) turns.push({ role: entry.type, text });
  }
  return turns;
}

/**
 * Render turns as conversation text: the first user prompt plus as many of the
 * most recent turns as fit the budget.
 */
export function renderConversation(turns: Turn[]): string {
  const first = turns.find((turn) => turn.role === "user");
  const lines: string[] = [];
  let used = 0;
  for (let index = turns.length - 1; index >= 0; index--) {
    const turn = turns[index]!;
    if (turn === first) break;
    const line = `${label(turn)}: ${turn.text}`;
    if (used + line.length > RECENT_BUDGET) {
      if (lines.length === 0) lines.unshift(line.slice(-RECENT_BUDGET));
      break;
    }
    lines.unshift(line);
    used += line.length;
  }
  if (first)
    lines.unshift(
      `${label(first)}: ${first.text.slice(0, FIRST_PROMPT_BUDGET)}`,
    );
  return lines.join("\n\n");
}

function label(turn: Turn) {
  return turn.role === "user" ? "User" : "Assistant";
}

export function composePrompt(
  conversation: string,
  categorize: boolean,
): string {
  return [
    TITLE_INSTRUCTION,
    categorize ? CATEGORY_INSTRUCTION : PLAIN_INSTRUCTION,
    "Conversation:",
    conversation,
  ].join("\n\n");
}

function firstLine(generated: string) {
  return generated
    .split("\n")
    .map((item) => item.trim().replace(/^["'`]+|["'`]+$/g, ""))
    .find((item) => item.length > 0);
}

export function formatTitle(prefix: string, generated: string) {
  const line = firstLine(generated);
  if (!line) return;
  const title = stripLeadingPrefix(prefix, line);
  if (!title) return;
  return `${prefix}: ${title}`.toLowerCase();
}

function stripLeadingPrefix(prefix: string, line: string) {
  const lower = line.toLowerCase();
  const head = prefix.toLowerCase();
  if (lower === head) return "";
  if (lower.startsWith(`${head}:`)) return line.slice(head.length + 1).trim();
  if (lower.startsWith(`${head} `)) return line.slice(head.length).trim();
  return line;
}

export function formatCategorized(generated: string) {
  const line = firstLine(generated);
  if (!line) return;
  return line.toLowerCase();
}

/**
 * Repository name from `git rev-parse --git-common-dir`, so linked worktrees
 * resolve to the primary checkout's name rather than the worktree directory.
 */
export function repositoryName(gitCommonDir: string): string | undefined {
  const parts = gitCommonDir
    .trim()
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean);
  const last = parts.at(-1);
  if (!last) return;
  if (last === ".git") return parts.at(-2);
  return last.replace(/\.git$/, "") || undefined;
}

/** `/title` or the plugin-namespaced `/session-title:title`. */
export function isTitleCommand(prompt: string): boolean {
  return /^\/(session-title:)?title$/.test(prompt.trim());
}
