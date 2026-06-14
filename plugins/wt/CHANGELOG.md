# Changelog

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
