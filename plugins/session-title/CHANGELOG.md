# Changelog

## 1.0.0

- `/title` starts background title generation through `opencode run --agent title -m openai/gpt-6-luna` and blocks the prompt, so it returns without a model turn.
- The next prompt applies the generated title through the `UserPromptSubmit` `sessionTitle` output.
- OpenCode plugin (moved from `~/.config/opencode/plugins/session-title.ts`): replaces the built-in title through the native `title` hook, sharing the formatting with the Claude Code side.
- Titles follow one format: `repo: title` inside a repository (linked worktrees use the primary checkout's name), `category: title` outside one, all lowercase.
