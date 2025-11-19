# Changelog - ni-plugin

All notable changes to the ni-plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-11-19

### Added
- Universal package manager command translation
- Dual platform support (Claude Code & OpenCode)
- Smart command detection and translation for npm, yarn, pnpm, and bun
- Configuration support via `config.json` for customization
- Zero-config operation with sensible defaults
- Comprehensive test coverage with unit tests
- Claude Code hook integration for seamless command interception
- OpenCode plugin architecture support
- Documentation with usage examples

### Features
- Automatically translates `npm install` → `ni`
- Automatically translates `npm run dev` → `nr dev`
- Automatically translates `yarn add` → `ni`
- Automatically translates `pnpm install` → `ni`
- Automatically translates `bun install` → `ni`
- Supports all ni variants: `ni`, `nr`, `nx`, `nu`, `nun`, `nci`, `na`
- Configurable command patterns and exclusions
- Platform-specific implementations for Claude Code and OpenCode

[unreleased]: https://github.com/aryasaatvik/coding-agent-plugins/compare/ni@1.0.0...HEAD
[1.0.0]: https://github.com/aryasaatvik/coding-agent-plugins/releases/tag/ni@1.0.0
