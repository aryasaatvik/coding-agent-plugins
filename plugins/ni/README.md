# ni-plugin

> Universal package manager plugin for Claude Code and OpenCode

Automatically translates package manager commands (npm, yarn, pnpm, bun) to use [`ni`](https://github.com/antfu-collective/ni) for seamless, universal package manager detection. Never worry about using the wrong package manager again!

## ✨ Features

- 🔄 **Universal Translation** - Automatically converts npm/yarn/pnpm/bun commands to `ni`
- 🎯 **Smart Detection** - `ni` automatically detects your project's package manager from lock files
- ⚡ **Fast** - Bundled JavaScript with Bun runtime
- 🛠️ **Configurable** - Optional configuration for advanced use cases
- 📦 **Zero Config** - Works out of the box with sensible defaults
- 🔌 **Dual Support** - Works with both Claude Code and OpenCode

## 📋 Prerequisites

- **[ni](https://github.com/antfu-collective/ni)** - Universal package manager wrapper
  ```bash
  npm i -g @antfu/ni
  # or
  bun add -g @antfu/ni
  ```

- **[bun](https://bun.sh)** - Required for building and running the plugin
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

## 🚀 Installation

### Via coding-agent-plugins Installer

The easiest way to install:

```bash
# Clone the repository
git clone https://github.com/aryasaatvik/coding-agent-plugins.git
cd coding-agent-plugins

# Run the installer and select ni-plugin
bun install.ts

# Or install directly
bun install.ts --plugins=ni
```

### Building from Source

```bash
cd plugins/ni
bun install
bun run build
```

## 🎯 How It Works

The plugin intercepts Bash commands before execution and translates package manager commands:

**Example Translations:**

```bash
# Original command      →  Translated command
npm install            →  ni
npm install package    →  ni package
npm run dev            →  nr dev
npm uninstall package  →  nun package
npm update             →  nup
npx create-app         →  nlx create-app
yarn add package       →  ni package
pnpm install           →  ni
bun add package        →  ni package
```

## ⚙️ Configuration

Create a `.ni-plugin.json` file in your project root or `~/.config/ni-plugin.json` globally:

```json
{
  "enabled": true,
  "dryRun": false,
  "debug": false,
  "disabledManagers": []
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the plugin |
| `dryRun` | boolean | `false` | Show what would be translated without executing |
| `debug` | boolean | `false` | Enable debug logging |
| `disabledManagers` | string[] | `[]` | List of managers to skip (e.g., `["npm", "yarn"]`) |

### Configuration Priority

1. Project-level: `.ni-plugin.json` in project root
2. Global-level: `~/.config/ni-plugin.json`
3. Default values

## 🧪 Testing

```bash
# Run tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

## 🛠️ Development

### Project Structure

```
plugins/ni/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── claude-code/
│   └── ni.ts                # Claude Code hook implementation
├── opencode/
│   ├── ni-plugin.ts         # OpenCode plugin source
│   └── ni-plugin.js         # Built OpenCode plugin
├── shared/
│   ├── config.ts            # Configuration loading
│   ├── translator.ts        # Command translation logic
│   ├── matcher.ts           # Pattern matching
│   └── types.ts             # TypeScript types
├── hooks/
│   ├── hooks.json           # Hook registration
│   └── ni-hook.js           # Built Claude Code hook
├── tests/
│   ├── config.test.ts
│   ├── translator.test.ts
│   └── matcher.test.ts
├── README.md
├── package.json
└── config.example.json
```

### Build Commands

```bash
# Build both platforms
bun run build

# Build Claude Code only
bun run build:claude

# Build OpenCode only
bun run build:opencode
```

## 📝 Command Reference

### ni - Install dependencies

```bash
# Maps from:
npm install
yarn
pnpm install
bun install
```

### nr - Run script

```bash
# Maps from:
npm run dev
yarn dev
pnpm run dev
bun run dev
```

### nun - Uninstall package

```bash
# Maps from:
npm uninstall package
yarn remove package
pnpm remove package
bun remove package
```

### nup - Update dependencies

```bash
# Maps from:
npm update
yarn upgrade
pnpm update
bun update
```

### nlx - Execute package

```bash
# Maps from:
npx command
yarn dlx command
pnpm dlx command
bunx command
```

## 🐛 Troubleshooting

### Plugin Not Working

1. Check if `ni` is installed: `which ni`
2. Enable debug mode in config: `"debug": true`
3. Check Claude Code logs: `~/.claude/logs/`
4. For OpenCode: Check console output

### Commands Not Being Translated

1. Verify plugin is enabled in config
2. Check if package manager is in `disabledManagers`
3. Enable `dryRun` to see what would be translated
4. Ensure you're in a JavaScript/TypeScript project

### Build Errors

1. Ensure Bun is installed: `bun --version`
2. Clean and rebuild: `rm -rf hooks/*.js opencode/*.js && bun run build`
3. Check for TypeScript errors: `bun run build`

## 📊 Performance

- **Translation Time**: < 1ms per command
- **Memory Footprint**: ~2MB
- **Build Size**: ~5.5KB (bundled)

## 🤝 Contributing

Contributions are welcome! Please see the [main repository](https://github.com/aryasaatvik/coding-agent-plugins) for contribution guidelines.

## 📝 License

MIT © Saatvik Arya

## 🔗 Links

- [Main Repository](https://github.com/aryasaatvik/coding-agent-plugins)
- [ni](https://github.com/antfu-collective/ni) by Anthony Fu
- [Claude Code](https://claude.ai/code)
- [OpenCode](https://opencode.ai)
