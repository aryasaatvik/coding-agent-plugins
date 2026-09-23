# session-title

> Session titles as `repo: title` or `category: title`, for Claude Code and OpenCode

- **Claude Code:** type `/title` at any point in a session. The plugin reads the conversation so
  far, asks OpenCode for a short title, and applies it with your next message.
  `/title` itself returns immediately and does not start a model turn.
- **OpenCode:** titles are generated automatically. The plugin hooks OpenCode's
  `title` request and generates the title with the session's model.

Both use the same format:

- inside a repository: `repo: title`, e.g. `dotfiles: reviewing globally installed skills`
  (linked worktrees use the primary checkout's name)
- outside one: `category: title`, where the model picks the category
- all lowercase

## Prerequisites

- **[bun](https://bun.sh)** to run the hook
- **[opencode](https://opencode.ai)** on `PATH`, signed in to a provider that serves `openai/gpt-6-luna` (Claude Code side)

## Installation

- **Claude Code:** `claude plugin install session-title@coding-agent-plugins`
- **OpenCode:** copy `opencode/session-title-plugin.js` into `~/.config/opencode/plugins/`

## How it works in Claude Code

Claude Code sets a session title only from a hook's `sessionTitle` output, and
a prompt the hook blocks cannot set one. So the work is split across two
prompts:

1. `/title`: the `UserPromptSubmit` hook starts `hooks/generate.js` as a
   detached process and blocks the prompt with a short notice.
2. `generate.js` extracts user prompts and assistant replies from the
   transcript (the first prompt plus about 12,000 characters of recent turns),
   runs `opencode run --agent title -m openai/gpt-6-luna` from a temporary
   directory (named with `--title`, so OpenCode doesn't title that run itself), formats the result, and writes it to
   `$CLAUDE_PLUGIN_DATA/<session_id>.title`. This takes about 3 to 10 seconds.
3. Your next prompt: the hook finds the pending title, returns it as
   `sessionTitle`, and deletes the file.

Generation failures are appended to `$CLAUDE_PLUGIN_DATA/errors.log`.

## How it works in OpenCode

`opencode/session-title-plugin.ts` registers a `session.hook("title")` handler.
It sends OpenCode's title instructions and the conversation text to
`ctx.generate.text` with the session's model, adds the category instruction
outside a repository, and sets `event.result` to the formatted title. A
directory counts as a repository when it contains `.git` or `.hg`.

## Development

```
plugins/session-title/
├── .claude-plugin/plugin.json
├── commands/title.md          # Registers /title (the hook intercepts it)
├── claude-code/
│   ├── hook.ts                # UserPromptSubmit hook source
│   └── generate.ts            # Detached generator source
├── opencode/
│   ├── session-title-plugin.ts  # OpenCode title hook source
│   └── session-title-plugin.js  # Built OpenCode plugin
├── shared/title.ts            # Transcript extraction, prompt, formatting
├── hooks/
│   ├── hooks.json
│   ├── session-title-hook.js  # Built hook
│   └── generate.js            # Built generator
└── tests/
```

```bash
bun run build
bun test
```

## License

MIT © Saatvik Arya
