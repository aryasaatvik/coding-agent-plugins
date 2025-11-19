# Coding Agent Plugins

> Collection of plugins for Claude Code and OpenCode

A curated collection of plugins that enhance your coding agent experience with both Claude Code and OpenCode. Install one or all plugins with our interactive installer.

## 🔌 Available Plugins

### [ni-plugin](plugins/ni/) v1.0.0

Universal package manager - automatically translates npm/yarn/pnpm/bun commands to use ni.

**Platforms:** Claude Code, OpenCode
**Category:** Development

[View Documentation →](plugins/ni/README.md)

---

_More plugins coming soon!_

## 🚀 Quick Start

### Interactive Installation

Install plugins interactively with our beautiful terminal UI:

```bash
# Clone the repository
git clone https://github.com/aryasaatvik/coding-agent-plugins.git
cd coding-agent-plugins

# Run the installer
bun install.ts
```

### Command-Line Installation

```bash
# Install all plugins
bun install.ts --all

# Install specific plugins
bun install.ts --plugins=ni

# Platform-specific installation
bun install.ts --claude-only
bun install.ts --opencode-only

# Skip confirmation prompts
bun install.ts --yes

# Preview changes without installing
bun install.ts --dry-run
```

## 📋 Prerequisites

- **[Bun](https://bun.sh)** - Runtime for installer and builds
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

- **[Claude Code](https://claude.ai/code)** or **[OpenCode](https://opencode.ai)** - Target platform

- **[jq](https://jqlang.github.io/jq/)** - JSON processing (Claude Code only)
  ```bash
  # macOS
  brew install jq

  # Linux (Debian/Ubuntu)
  sudo apt-get install jq

  # Linux (RHEL/CentOS)
  sudo yum install jq
  ```

## 🎯 Features

- ✨ **Interactive Installer** - Beautiful checkbox-based terminal UI
- 🔍 **Auto-Detection** - Automatically detects Claude Code and OpenCode
- 🎯 **Selective Installation** - Install all plugins or pick specific ones
- ⚡ **Fast** - Built with Bun for maximum performance
- 🛠️ **Configurable** - CLI flags for automation
- 📦 **Zero Config** - Works out of the box

## 🏗️ Plugin Structure

Each plugin follows a consistent structure:

```
plugins/[plugin-name]/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── claude-code/             # Claude Code implementation
├── opencode/                # OpenCode implementation
├── shared/                  # Shared logic between platforms
├── hooks/                   # Claude Code hooks
├── tests/                   # Test suite
├── README.md                # Plugin documentation
└── package.json             # Plugin package info
```

## 🤝 Contributing

Want to add a new plugin? We welcome contributions!

1. Fork the repository
2. Create a new plugin in `plugins/your-plugin/`
3. Follow the existing plugin structure
4. Add your plugin to `.claude-plugin/marketplace.json`
5. Write tests and documentation
6. Submit a pull request

See existing plugins like [`ni`](plugins/ni/) for reference.

## 📚 Development

This repository uses [Turborepo](https://turbo.build/repo) for efficient monorepo management with intelligent caching and parallel execution.

### Building Plugins

```bash
# Build all plugins
bun run build

# Build specific plugin
turbo run build --filter=@coding-agent-plugins/ni

# Build with cache information
turbo run build --summarize
```

### Testing

```bash
# Test all plugins
bun run test

# Test specific plugin
turbo run test --filter=@coding-agent-plugins/ni

# Test in watch mode
cd plugins/ni && bun test --watch
```

### Creating New Plugins

Use the Turborepo generator to scaffold a new plugin:

```bash
# Interactive plugin creation
bun run generate plugin

# The generator will:
# - Prompt for plugin name, description, category
# - Let you choose platforms (Claude Code, OpenCode, or both)
# - Create all necessary files and directories
# - Update marketplace.json automatically
```

After creating a plugin:

1. `cd plugins/your-plugin`
2. `bun install`
3. Implement your plugin logic
4. `turbo run build --filter=your-plugin`
5. `bun test`

### Turborepo Commands

```bash
# Run dev mode for all plugins
bun run dev

# Clean all build artifacts
bun run clean

# View Turborepo cache
turbo run build --dry-run

# Force rebuild without cache
turbo run build --force
```

## 📝 License

MIT © Saatvik Arya

See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [ni](https://github.com/antfu-collective/ni) by Anthony Fu - Universal package manager wrapper
- [Claude Code](https://claude.ai/code) by Anthropic - AI coding assistant
- [OpenCode](https://opencode.ai) - Open-source coding assistant
- [@clack/prompts](https://github.com/natemoo-re/clack) - Beautiful terminal prompts

---

**Repository:** [github.com/aryasaatvik/coding-agent-plugins](https://github.com/aryasaatvik/coding-agent-plugins)
**Author:** [Saatvik Arya](https://github.com/aryasaatvik)
