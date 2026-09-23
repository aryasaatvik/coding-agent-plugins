/**
 * Command analysis for wt-plugin
 *
 * Detects `git worktree add` invocations and produces an equivalent `wt new`
 * suggestion. Unlike a package-manager rewrite, `git worktree add` cannot be
 * mechanically rewritten into `wt` (wt owns the worktree path and adds side
 * effects), so the hook *denies* the command and hands back this suggestion.
 */

import { basename } from "path";
import type { Config, ParsedWorktreeAdd, WorktreeSuggestion } from "./types";

/**
 * Flags whose behavior wt cannot express — when present, leave git alone.
 */
const PASSTHROUGH_FLAGS = ["--detach", "--no-checkout", "--orphan"];

/**
 * Long flags that consume the following token as their value.
 */
const VALUE_FLAGS = ["-b", "-B", "--reason"];

/**
 * Explicit opt-out: prefix a command with `WT_HOOK_OFF=1` to bypass the nudge.
 */
function isBypassed(command: string): boolean {
  if (process.env.WT_HOOK_OFF === "1") return true;
  return /(^|\s)WT_HOOK_OFF=1(\s|$)/.test(command);
}

/**
 * git global options that consume the following token as their value.
 */
const GIT_VALUE_OPTIONS = ["-C", "-c", "--git-dir", "--work-tree", "--namespace"];

/**
 * Arguments after `worktree add` when a shell segment runs `git worktree add`,
 * else null. `git` must be the segment's command (after optional env
 * assignments), so text such as `echo "git worktree add"` does not match.
 */
function worktreeAddArgs(segment: string): string[] | null {
  const tokens = segment.trim().split(/\s+/);
  let i = 0;
  while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i] ?? "")) i++;
  if (tokens[i] !== "git") return null;
  i++;
  while (tokens[i]?.startsWith("-")) {
    i += GIT_VALUE_OPTIONS.includes(tokens[i]!) ? 2 : 1;
  }
  if (tokens[i] !== "worktree" || tokens[i + 1] !== "add") return null;
  return tokens.slice(i + 2);
}

/**
 * Parse the arguments of a `git worktree add` command.
 *
 * Returns null when this isn't a `git worktree add`, when a passthrough flag is
 * present, or when no branch can be determined.
 */
export function parseWorktreeAdd(
  command: string,
  config: Config = {}
): ParsedWorktreeAdd | null {
  const rest = command
    .split(/&&|\|\||[;|\n]/)
    .map(worktreeAddArgs)
    .find((args) => args !== null);
  if (!rest) {
    return null;
  }

  let newBranch: string | undefined;
  const positionals: string[] = [];

  for (let k = 0; k < rest.length; k++) {
    const t = rest[k];
    if (PASSTHROUGH_FLAGS.includes(t)) {
      return null;
    }
    if (t === "-b" || t === "-B") {
      newBranch = rest[++k];
      continue;
    }
    if (VALUE_FLAGS.includes(t)) {
      k++; // skip the flag's value
      continue;
    }
    if (t.startsWith("-")) {
      continue; // unknown/standalone flag (e.g. --force, --lock)
    }
    positionals.push(t);
  }

  // positionals: [<path>, <commit-ish>?]
  let branch: string | undefined;
  let base: string | undefined;
  let checkoutExisting = false;

  if (newBranch) {
    branch = newBranch;
    base = positionals[1];
  } else if (positionals.length >= 2) {
    // `git worktree add <path> <ref>` -> check out an existing ref
    branch = positionals[1];
    checkoutExisting = true;
  } else if (positionals.length === 1) {
    // `git worktree add <path>` -> git names the branch after the path
    branch = basename(positionals[0]);
  }

  if (!branch) {
    return null;
  }

  return { branch, base, checkoutExisting };
}

/**
 * Build the `wt new` suggestion string for a parsed command.
 */
function buildSuggestion(parsed: ParsedWorktreeAdd): string {
  let suggestion = `wt new ${parsed.branch}`;
  // Only carry a base for newly-created branches; checking out an existing ref
  // needs none (wt detects and checks it out).
  if (!parsed.checkoutExisting && parsed.base) {
    suggestion += ` ${parsed.base}`;
  }
  return suggestion;
}

/**
 * Analyze a command and, when it's a translatable `git worktree add`, return a
 * `wt` suggestion plus an agent-facing reason. Returns null to leave the
 * command untouched.
 */
export function analyzeCommand(
  command: string,
  config: Config = {}
): WorktreeSuggestion | null {
  if (!command || !command.trim()) {
    return null;
  }
  if (isBypassed(command)) {
    return null;
  }

  const parsed = parseWorktreeAdd(command, config);
  if (!parsed) {
    return null;
  }

  const defaultBase = config.defaultBase ?? "main";
  const suggestion = buildSuggestion(parsed);

  const baseNote =
    !parsed.checkoutExisting && !parsed.base
      ? ` (wt bases new branches off \`${defaultBase}\`; append a base branch if you need a different one, e.g. \`${suggestion} <base>\`.)`
      : "";

  const reason =
    `Use \`${suggestion}\` instead of \`git worktree add\`. ` +
    `wt creates the worktree, runs the repo's post-install setup, and links the shared Scratchpad.` +
    baseNote +
    ` If you specifically need the raw git invocation (custom path, --detach, scripting), ` +
    `re-run the command prefixed with \`WT_HOOK_OFF=1\`.`;

  return { suggestion, reason };
}

/**
 * Analyze a Claude Code EnterWorktree call. Entering an existing worktree by
 * `path` is allowed; any call without `path` creates a Claude-managed worktree
 * under .claude/worktrees/ (with `name` or a generated one), so it gets the
 * wt equivalent instead.
 */
export function analyzeEnterWorktree(input: {
  name?: unknown;
  path?: unknown;
}): WorktreeSuggestion | null {
  if (typeof input.path === "string" && input.path.trim()) {
    return null;
  }

  const suggestion =
    typeof input.name === "string" && input.name.trim()
      ? `wt new ${input.name.trim()}`
      : "wt new <branch> [base]";

  const reason =
    `Do not create Claude-managed worktrees. Create the worktree with \`${suggestion}\`, ` +
    `then enter it with EnterWorktree \`path\` (the path \`git worktree list\` shows). ` +
    `wt runs the repo's post-install setup and links the shared Scratchpad.`;

  return { suggestion, reason };
}

/**
 * Analyze a Claude Code Agent call. `isolation: "worktree"` gives the subagent
 * a Claude-managed worktree, so it gets a wt worktree plus `cd` instead.
 */
export function analyzeAgent(input: {
  isolation?: unknown;
}): WorktreeSuggestion | null {
  if (input.isolation !== "worktree") {
    return null;
  }

  const suggestion = "wt new <branch> [base]";

  const reason =
    `Do not use agent \`isolation: "worktree"\`; it creates a Claude-managed worktree. ` +
    `Create the worktree with \`${suggestion}\`, then relaunch the agent without \`isolation\` ` +
    `and have it \`cd\` into the worktree path (the path \`git worktree list\` shows).`;

  return { suggestion, reason };
}
