# wt-plugin

> Nudge `git worktree add` toward the [`wt`](https://github.com/aryasaatvik/wt) CLI

When an agent runs `git worktree add`, this plugin steps in and suggests the
equivalent `wt new` command instead. `wt` creates the worktree under
`../<repo>-worktrees/<slug>/`, syncs gitignored files (`.env`, `.scratchpad`,
editor config) from the source repo, and runs [`ni`](https://github.com/antfu/ni)
to install dependencies — so the new worktree is ready to work in immediately.

## ✨ Features

- 🌳 **Smart nudge** — detects `git worktree add` and suggests `wt new <branch> [base]`
- 🎯 **Surgical scope** — only `add` is touched; `list`, `remove`, `prune`, `move`, `lock` pass through
- 🪂 **Escape hatch** — `--detach` / `--no-checkout` / `--orphan` and a `WT_HOOK_OFF=1` prefix bypass the nudge
- 🔌 **Dual support** — works with both Claude Code and OpenCode
- ⚙️ **Configurable** — hard block (default) or soft advisory via `dryRun`

## 📋 Prerequisites

- **[wt](https://github.com/aryasaatvik/wt)** — the worktree helper this plugin promotes
- **[bun](https://bun.sh)** — required to build and run the plugin

## 🎯 How It Works

The plugin cannot mechanically *rewrite* `git worktree add` into `wt` the way a
package-manager translator can: `git worktree add` takes an explicit path,
whereas `wt new` owns the worktree path and adds side effects (file sync + install).
So instead of a silent rewrite it **denies** the raw command and hands the agent a
concrete suggestion — the agent re-issues `wt new …` and reads wt's output to learn
the real worktree path.

| `git worktree add …` | suggestion |
|---|---|
| `git worktree add -b feature/x ../x main` | `wt new feature/x main` |
| `git worktree add -b feat ../feat` | `wt new feat` |
| `git worktree add ../x existing-branch` | `wt new existing-branch` |
| `git worktree add ../x-feature` | `wt new x-feature` |

- **Claude Code** — a `PreToolUse` hook returns `permissionDecision: "deny"` with the suggestion as the reason.
- **OpenCode 2** — a `tool.execute.before` hook on the `shell` tool throws with the suggestion (OpenCode aborts the tool and shows the message). V1 is not supported.

## ⚙️ Configuration

Create a `.wt-plugin.json` in your project root or `~/.config/wt-plugin/config.json` globally:

```json
{
  "enabled": true,
  "dryRun": false,
  "debug": false,
  "defaultBase": "main"
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the plugin |
| `dryRun` | boolean | `false` | Advise (systemMessage) instead of blocking |
| `debug` | boolean | `false` | Enable debug logging |
| `defaultBase` | string | `"main"` | Base branch wt creates new branches from |

### Bypassing for a single command

Prefix the command with `WT_HOOK_OFF=1` when you genuinely need the raw git
invocation (custom path, `--detach`, scripting):

```bash
WT_HOOK_OFF=1 git worktree add /tmp/scratch -b throwaway
```

## 🧪 Testing

```bash
bun test
```

## 🛠️ Development

```
plugins/wt/
├── .claude-plugin/plugin.json   # Plugin metadata
├── claude-code/wt.ts            # Claude Code hook source
├── opencode/wt-plugin.ts        # OpenCode plugin source
├── shared/
│   ├── config.ts                # Configuration loading
│   ├── translator.ts            # git worktree add → wt analysis
│   └── types.ts                 # Shared types
├── hooks/
│   ├── hooks.json               # Hook registration (PreToolUse / Bash)
│   └── wt-hook.js               # Built Claude Code hook
├── tests/
└── config.example.json
```

```bash
# Build both platforms
bun run build

# Build one platform
bun run build:claude
bun run build:opencode
```

## 📝 License

MIT © Saatvik Arya
