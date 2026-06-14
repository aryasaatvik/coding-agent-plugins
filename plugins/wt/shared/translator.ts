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
 * Parse the arguments of a `git worktree add` command.
 *
 * Returns null when this isn't a `git worktree add`, when a passthrough flag is
 * present, or when no branch can be determined.
 */
export function parseWorktreeAdd(
  command: string,
  config: Config = {}
): ParsedWorktreeAdd | null {
  const tokens = command.trim().split(/\s+/);

  // Locate the `worktree add` pair and ensure it belongs to a `git` invocation.
  const wi = tokens.findIndex(
    (t, idx) => t === "worktree" && tokens[idx + 1] === "add"
  );
  if (wi < 1 || !tokens.slice(0, wi).includes("git")) {
    return null;
  }

  const rest = tokens.slice(wi + 2);

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
    `wt creates the worktree under ../<repo>-worktrees/<slug>/, syncs gitignored files ` +
    `(.env, .scratchpad, editor config) from the source repo, and runs \`ni\` to install dependencies.` +
    baseNote +
    ` If you specifically need the raw git invocation (custom path, --detach, scripting), ` +
    `re-run the command prefixed with \`WT_HOOK_OFF=1\`.`;

  return { suggestion, reason };
}
