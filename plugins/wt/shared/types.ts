/**
 * Shared TypeScript types for wt-plugin
 */

/**
 * Plugin configuration options
 */
export interface Config {
  /**
   * Enable or disable the plugin entirely
   * @default true
   */
  enabled?: boolean;

  /**
   * Dry run mode - advise without blocking the command
   * @default false
   */
  dryRun?: boolean;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Base branch wt creates new branches from (mirrors `wt new <branch> [base]`)
   * @default "main"
   */
  defaultBase?: string;
}

/**
 * Parsed `git worktree add` invocation
 */
export interface ParsedWorktreeAdd {
  /**
   * Branch the worktree targets (new branch via -b, an existing ref, or
   * the basename of the path when neither is given)
   */
  branch: string;

  /**
   * Base/commit-ish to branch from, if one was supplied
   */
  base?: string;

  /**
   * True when the command checks out an existing ref rather than creating one
   */
  checkoutExisting: boolean;
}

/**
 * Result of analyzing a command - a suggested `wt` replacement
 */
export interface WorktreeSuggestion {
  /**
   * Suggested wt command, e.g. "wt new feature/x main"
   */
  suggestion: string;

  /**
   * Agent-facing explanation of why wt is preferred and how to bypass
   */
  reason: string;
}
