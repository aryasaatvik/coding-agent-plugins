#!/usr/bin/env bun
// @bun

// shared/config.ts
import { existsSync } from "fs";
import { join } from "path";
function getDefaultConfig() {
  return {
    enabled: true,
    dryRun: false,
    debug: false
  };
}
function validateConfig(config) {
  if (!config || typeof config !== "object") {
    return getDefaultConfig();
  }
  const c = config;
  const defaults = getDefaultConfig();
  const validated = {
    enabled: typeof c.enabled === "boolean" ? c.enabled : defaults.enabled,
    dryRun: typeof c.dryRun === "boolean" ? c.dryRun : defaults.dryRun,
    debug: typeof c.debug === "boolean" ? c.debug : defaults.debug
  };
  return validated;
}
async function loadConfigFile(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    const file = Bun.file(path);
    const content = await file.json();
    return validateConfig(content);
  } catch (error) {
    return null;
  }
}
async function loadConfig(cwd) {
  const configPaths = [
    join(cwd, ".wt-plugin.json"),
    join(process.env.HOME || "~", ".config", "wt-plugin", "config.json")
  ];
  for (const path of configPaths) {
    const config = await loadConfigFile(path);
    if (config !== null) {
      return config;
    }
  }
  return getDefaultConfig();
}

// shared/translator.ts
import { basename } from "path";
var PASSTHROUGH_FLAGS = ["--detach", "--no-checkout", "--orphan"];
var VALUE_FLAGS = ["-b", "-B", "--reason"];
function isBypassed(command) {
  if (process.env.WT_HOOK_OFF === "1")
    return true;
  return /(^|\s)WT_HOOK_OFF=1(\s|$)/.test(command);
}
var GIT_VALUE_OPTIONS = ["-C", "-c", "--git-dir", "--work-tree", "--namespace"];
function worktreeAddArgs(segment) {
  const tokens = segment.trim().split(/\s+/);
  let i = 0;
  while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i] ?? ""))
    i++;
  if (tokens[i] !== "git")
    return null;
  i++;
  while (tokens[i]?.startsWith("-")) {
    i += GIT_VALUE_OPTIONS.includes(tokens[i]) ? 2 : 1;
  }
  if (tokens[i] !== "worktree" || tokens[i + 1] !== "add")
    return null;
  return tokens.slice(i + 2);
}
function parseWorktreeAdd(command, config = {}) {
  const rest = command.split(/&&|\|\||[;|\n]/).map(worktreeAddArgs).find((args) => args !== null);
  if (!rest) {
    return null;
  }
  let newBranch;
  const positionals = [];
  for (let k = 0;k < rest.length; k++) {
    const t = rest[k];
    if (PASSTHROUGH_FLAGS.includes(t)) {
      return null;
    }
    if (t === "-b" || t === "-B") {
      newBranch = rest[++k];
      continue;
    }
    if (VALUE_FLAGS.includes(t)) {
      k++;
      continue;
    }
    if (t.startsWith("-")) {
      continue;
    }
    positionals.push(t);
  }
  let branch;
  let base;
  let checkoutExisting = false;
  if (newBranch) {
    branch = newBranch;
    base = positionals[1];
  } else if (positionals.length >= 2) {
    branch = positionals[1];
    checkoutExisting = true;
  } else if (positionals.length === 1) {
    branch = basename(positionals[0]);
  }
  if (!branch) {
    return null;
  }
  return { branch, base, checkoutExisting };
}
function buildSuggestion(parsed) {
  let suggestion = `wt new ${parsed.branch}`;
  if (!parsed.checkoutExisting && parsed.base) {
    suggestion += ` ${parsed.base}`;
  }
  return suggestion;
}
function analyzeCommand(command, config = {}) {
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
  const suggestion = buildSuggestion(parsed);
  const baseNote = !parsed.checkoutExisting && !parsed.base ? ` (wt bases new branches off the remote's default branch, \`origin/HEAD\`; append a base branch if you need a different one, e.g. \`${suggestion} <base>\`.)` : "";
  const reason = `Use \`${suggestion}\` instead of \`git worktree add\`. ` + `wt creates the worktree, runs the repo's post-install setup, and links the shared Scratchpad.` + baseNote + ` If you specifically need the raw git invocation (custom path, --detach, scripting), ` + `re-run the command prefixed with \`WT_HOOK_OFF=1\`.`;
  return { suggestion, reason };
}
function analyzeEnterWorktree(input) {
  if (typeof input.path === "string" && input.path.trim()) {
    return null;
  }
  const suggestion = typeof input.name === "string" && input.name.trim() ? `wt new ${input.name.trim()}` : "wt new <branch> [base]";
  const reason = `Do not create Claude-managed worktrees. Create the worktree with \`${suggestion}\`, ` + `then enter it with EnterWorktree \`path\` (the path \`git worktree list\` shows). ` + `wt runs the repo's post-install setup and links the shared Scratchpad.`;
  return { suggestion, reason };
}
function analyzeAgent(input) {
  if (input.isolation !== "worktree") {
    return null;
  }
  const suggestion = "wt new <branch> [base]";
  const reason = `Do not use agent \`isolation: "worktree"\`; it creates a Claude-managed worktree. ` + `Create the worktree with \`${suggestion}\`, then relaunch the agent without \`isolation\` ` + `and have it \`cd\` into the worktree path (the path \`git worktree list\` shows).`;
  return { suggestion, reason };
}

// claude-code/wt.ts
function analyze({ tool_name, tool_input }, config) {
  switch (tool_name) {
    case "Bash": {
      const result = typeof tool_input.command === "string" ? analyzeCommand(tool_input.command, config) : null;
      return result && {
        ...result,
        reason: `${result.reason} After \`wt new\`, enter the worktree with EnterWorktree \`path\` (the path \`git worktree list\` shows).`
      };
    }
    case "EnterWorktree":
      return analyzeEnterWorktree(tool_input);
    case "Agent":
    case "Task":
      return analyzeAgent(tool_input);
    default:
      return null;
  }
}
async function main() {
  try {
    const hookInput = JSON.parse(await Bun.stdin.text());
    const config = await loadConfig(hookInput.cwd);
    if (config.enabled === false) {
      process.exit(0);
    }
    if (config.debug) {
      console.error(`[wt-plugin] Processing ${hookInput.tool_name}:`, JSON.stringify(hookInput.tool_input));
      console.error(`[wt-plugin] Config:`, JSON.stringify(config));
    }
    const result = analyze(hookInput, config);
    if (!result) {
      process.exit(0);
    }
    if (config.dryRun) {
      const output = {
        systemMessage: `[DRY RUN] wt-plugin would suggest: \`${result.suggestion}\``
      };
      console.log(JSON.stringify(output));
      process.exit(0);
    }
    const output = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: result.reason
      }
    };
    console.log(JSON.stringify(output));
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
main();
