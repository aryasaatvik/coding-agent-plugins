# Changelog

## 1.1.0

- Claude Code: deny `EnterWorktree` calls without `path` (with `name` or a
  generated name, they create Claude-managed worktrees); entering an existing
  worktree by `path` stays allowed.
- Claude Code: deny `Agent` calls with `isolation: "worktree"` and point to
  `wt new` plus `cd`.
- Claude Code: catch `git -C <repo> worktree add` (the hook no longer filters
  on a `git worktree add*` prefix). `git` must be the command of a shell
  segment, so the phrase inside strings, heredocs, or other commands' arguments
  is ignored.
- Claude Code: drop the `systemMessage`; the deny reason carries the
  suggestion.
- Deny reasons match the global worktree rules: wt runs the repo's
  post-install setup and links the shared Scratchpad.

## 1.0.0

- Initial release.
- Claude Code `PreToolUse` hook and OpenCode `tool.execute.before` hook that
  detect `git worktree add` and nudge toward `wt new`.
- Denies the raw command (Claude Code) / throws to abort (OpenCode) with a
  concrete `wt new <branch> [base]` suggestion.
- Parses `-b`/`-B` new branches, existing-ref checkouts, and path-only adds.
- Passes through `--detach`, `--no-checkout`, `--orphan`, and any command
  prefixed with `WT_HOOK_OFF=1`.
- Configurable via `.wt-plugin.json` / `~/.config/wt-plugin/config.json`
  (`enabled`, `dryRun`, `debug`, `defaultBase`).
