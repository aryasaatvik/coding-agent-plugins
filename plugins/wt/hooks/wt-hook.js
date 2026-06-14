#!/usr/bin/env bun
// @bun

// shared/config.ts
import { existsSync } from "fs";
import { join } from "path";
function getDefaultConfig() {
  return {
    enabled: true,
    dryRun: false,
    debug: false,
    defaultBase: "main"
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
    debug: typeof c.debug === "boolean" ? c.debug : defaults.debug,
    defaultBase: typeof c.defaultBase === "string" && c.defaultBase.trim().length > 0 ? c.defaultBase.trim() : defaults.defaultBase
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
function parseWorktreeAdd(command, config = {}) {
  const tokens = command.trim().split(/\s+/);
  const wi = tokens.findIndex((t, idx) => t === "worktree" && tokens[idx + 1] === "add");
  if (wi < 1 || !tokens.slice(0, wi).includes("git")) {
    return null;
  }
  const rest = tokens.slice(wi + 2);
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
  const defaultBase = config.defaultBase ?? "main";
  const suggestion = buildSuggestion(parsed);
  const baseNote = !parsed.checkoutExisting && !parsed.base ? ` (wt bases new branches off \`${defaultBase}\`; append a base branch if you need a different one, e.g. \`${suggestion} <base>\`.)` : "";
  const reason = `Use \`${suggestion}\` instead of \`git worktree add\`. ` + `wt creates the worktree under ../<repo>-worktrees/<slug>/, syncs gitignored files ` + `(.env, .scratchpad, editor config) from the source repo, and runs \`ni\` to install dependencies.` + baseNote + ` If you specifically need the raw git invocation (custom path, --detach, scripting), ` + `re-run the command prefixed with \`WT_HOOK_OFF=1\`.`;
  return { suggestion, reason };
}

// claude-code/wt.ts
async function main() {
  try {
    const input = await Bun.stdin.text();
    const hookInput = JSON.parse(input);
    const { tool_name, tool_input, cwd } = hookInput;
    const command = tool_input.command;
    if (tool_name !== "Bash" || !command) {
      process.exit(0);
    }
    const config = await loadConfig(cwd);
    if (config.enabled === false) {
      process.exit(0);
    }
    if (config.debug) {
      console.error(`[wt-plugin] Processing command: ${command}`);
      console.error(`[wt-plugin] Config:`, JSON.stringify(config));
    }
    const result = analyzeCommand(command, config);
    if (!result) {
      if (config.debug) {
        console.error(`[wt-plugin] No suggestion for: ${command}`);
      }
      process.exit(0);
    }
    if (config.dryRun) {
      const output2 = {
        systemMessage: `\uD83C\uDF33 [DRY RUN] wt-plugin would suggest: \`${result.suggestion}\``
      };
      console.log(JSON.stringify(output2, null, 2));
      process.exit(0);
    }
    const output = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: result.reason
      },
      systemMessage: `\uD83C\uDF33 wt-plugin: suggested \`${result.suggestion}\` instead of \`git worktree add\``
    };
    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
main();
