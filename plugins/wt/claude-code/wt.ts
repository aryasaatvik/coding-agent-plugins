#!/usr/bin/env bun

/**
 * wt-plugin for Claude Code
 *
 * Steers worktree creation toward `wt new` (which runs the repo's post-install
 * setup and links the shared Scratchpad) by denying the Claude Code paths that
 * create worktrees without it and handing the agent the wt equivalent:
 * - Bash `git worktree add` (other `git worktree` subcommands pass through)
 * - EnterWorktree without `path` (entering an existing worktree by `path` is allowed)
 * - Agent with `isolation: "worktree"`
 */

import { loadConfig } from "../shared/config";
import {
  analyzeAgent,
  analyzeCommand,
  analyzeEnterWorktree,
} from "../shared/translator";
import type { Config, WorktreeSuggestion } from "../shared/types";

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
}

interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string;
    permissionDecision: "deny";
    permissionDecisionReason: string;
  };
  systemMessage?: string;
}

function analyze(
  { tool_name, tool_input }: HookInput,
  config: Config
): WorktreeSuggestion | null {
  switch (tool_name) {
    case "Bash": {
      const result =
        typeof tool_input.command === "string"
          ? analyzeCommand(tool_input.command, config)
          : null;
      return result && {
        ...result,
        reason: `${result.reason} After \`wt new\`, enter the worktree with EnterWorktree \`path\` (the path \`git worktree list\` shows).`,
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
    const hookInput: HookInput = JSON.parse(await Bun.stdin.text());

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

    // Dry run - advise without blocking.
    if (config.dryRun) {
      const output: HookOutput = {
        systemMessage: `[DRY RUN] wt-plugin would suggest: \`${result.suggestion}\``,
      };
      console.log(JSON.stringify(output));
      process.exit(0);
    }

    // Block the call and hand the agent the wt equivalent.
    const output: HookOutput = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: result.reason,
      },
    };

    console.log(JSON.stringify(output));
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
