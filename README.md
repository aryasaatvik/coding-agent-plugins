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

### [wt-plugin](plugins/wt/) v1.0.0

Nudges `git worktree add` toward the [`wt`](https://github.com/aryasaatvik/wt) CLI, which syncs gitignored files and installs dependencies in new worktrees.

**Platforms:** Claude Code, OpenCode
**Category:** Development
**Pairs with:** [`wt`](https://github.com/aryasaatvik/wt) — the standalone worktree helper this plugin promotes

[View Documentation →](plugins/wt/README.md)

---

_More plugins coming soon!_

## 🚀 Quick Start

### Installation via NPM (Recommended)

Install plugins using the CLI package:

```bash
# Interactive installation (recommended)
bunx coding-agent-plugins

# Or with npx
npx coding-agent-plugins
```

### Command-Line Options

```bash
# Install all plugins
bunx coding-agent-plugins install --all

# Install specific plugins
bunx coding-agent-plugins install --plugins=ni

# Platform-specific installation
bunx coding-agent-plugins install --claude-only
bunx coding-agent-plugins install --opencode-only

# Skip confirmation prompts
bunx coding-agent-plugins install --yes

# Preview changes without installing
bunx coding-agent-plugins install --dry-run
```

### Alternative: Local Installation

If you prefer to clone the repository:

```bash
# Clone the repository
git clone https://github.com/aryasaatvik/coding-agent-plugins.git
cd coding-agent-plugins

# Install dependencies
bun install

# Run the installer
bun install.ts
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

## 🚀 Releasing Plugins

This repository uses per-plugin versioning with namespace@version tags (e.g., `ni@1.0.0`).

### Quick Release

Use the `/release` slash command in Claude Code:

```
/release
```

The command will guide you through:
1. Selecting which plugin to release
2. Choosing the new version (with semver suggestions)
3. Updating version files and changelog
4. Creating and pushing the release tag
5. Monitoring the GitHub Actions workflow

### Manual Release

If you prefer to release manually:

1. **Update version files** (3 files must be synchronized):
   ```bash
   # plugins/<plugin>/package.json
   # plugins/<plugin>/.claude-plugin/plugin.json
   # .claude-plugin/marketplace.json
   ```

2. **Update changelog**:
   ```bash
   # Add entry to plugins/<plugin>/CHANGELOG.md
   ```

3. **Create release commit**:
   ```bash
   git add plugins/<plugin>/package.json \
           plugins/<plugin>/.claude-plugin/plugin.json \
           .claude-plugin/marketplace.json \
           plugins/<plugin>/CHANGELOG.md
   git commit -m "chore(release): <plugin>@<version>"
   ```

4. **Create and push tag**:
   ```bash
   git tag -a "<plugin>@<version>" -m "Release <plugin>@<version>"
   git push origin main
   git push origin <plugin>@<version>
   ```

5. **Monitor release**:
   - GitHub Actions will automatically build, test, and package the plugin
   - A new release will be created at: `https://github.com/aryasaatvik/coding-agent-plugins/releases/tag/<plugin>@<version>`

### Tag Format

- **Plugin releases**: `<plugin-name>@<version>` (e.g., `ni@1.0.0`, `ni@1.1.0-beta.1`)
- Each plugin is versioned independently
- Supports full semantic versioning including pre-releases

### Release Assets

Each plugin release includes:
- `<plugin-name>-plugin.tar.gz` - Plugin distribution tarball
- `checksums.txt` - SHA256 checksums for verification

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
