# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-11-19

### Added
- 🎉 **Initial release** of coding-agent-plugins collection
- ✨ **Interactive installer** with beautiful checkbox-based terminal UI using @clack/prompts
- 🔍 **Auto-detection** of Claude Code and OpenCode platforms
- 🎯 **Selective installation** - Install all plugins or pick specific ones
- 📦 **Multi-plugin architecture** - Scalable structure for future plugins
- 🛠️ **Build system** - Centralized scripts for building and testing all plugins
- 📚 **Comprehensive documentation** - Root README and plugin-specific docs

### Changed
- **BREAKING**: Repository renamed from `ni-plugin` to `coding-agent-plugins`
- **BREAKING**: Restructured as multi-plugin collection
- **BREAKING**: Fresh git history (old history preserved in ni-plugin-archive)
- **BREAKING**: Version reset to 1.0.0

### Included Plugins

#### ni-plugin v1.0.0
- Universal package manager plugin - automatically translates npm/yarn/pnpm/bun commands to use ni
- Dual platform support (Claude Code & OpenCode)
- Smart command translation with configuration support
- Zero-config operation with sensible defaults
- Comprehensive test coverage

[unreleased]: https://github.com/aryasaatvik/coding-agent-plugins/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/aryasaatvik/coding-agent-plugins/releases/tag/v1.0.0
