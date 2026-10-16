# Contributing

Use the Bun version in the root `packageManager` field (`bun@1.3.2`). Run
`bun install --frozen-lockfile` from the repository root. npm is also needed for
the offline installed CLI consumer check; packaging uses `tar`.

| Command                 | Meaning                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `bun run format`        | Format maintained source, config, and docs with oxfmt.                             |
| `bun run format:check`  | Check formatting without writing files.                                            |
| `bun run lint`          | Run oxlint; warnings fail.                                                         |
| `bun run typecheck`     | Check plugins, CLI, scripts, and generator config with the root TypeScript config. |
| `bun run test`          | Run the ordinary offline plugin tests.                                             |
| `bun run check`         | Run formatting, lint, types, and ordinary tests in that order.                     |
| `bun run build`         | Build Claude Code hooks, OpenCode bundles, and the npm CLI.                        |
| `bun run test:artifact` | Package and smoke-test existing build output; run build first.                     |
| `bun run release:check` | Run check, build, and artifact validation before publication.                      |

Generated `plugins/*/hooks/*.js`, `plugins/*/opencode/*-plugin.js`, and all
Handlebars (`.hbs`) templates are excluded from formatting and linting. Change
TypeScript sources, regenerate bundles with pinned Bun, and commit the generated
output. Never hand-format bundles or templates. To verify generated output is
current, run `bun run build --force` and inspect `git diff`.

The ordinary tests use temporary project/global config fixtures. Do not replace
HOME or use real user config in tests. Artifact checks extract plugin tarballs
into temporary directories, inspect manifests and hook references, import
OpenCode bundles, and run harmless hooks with local config. They also check the
session-title command and generator assets. They do not exercise live host or
model integrations.

The CLI consumer check packs the bundled npm package, installs it offline into a
temporary project with scripts disabled and a fresh cache, and invokes only
`--help` and `--version`. It never runs the plugin installer. The CLI's bundled
runtime needs no npm dependencies; build dependencies remain development-only.

## Publication

The existing release workflow runs only for `<plugin>@<version>` tags or manual
dispatch. It installs frozen dependencies using the root Bun pin, runs
`release:check`, and uploads the selected validated tarball. The GitHub Release
job depends on that validation job and downloads those exact bytes. Manual
branch dispatch validates/packages but does not create a release. Ordinary CI
runs on pull requests and pushes to main, using the root Bun pin, frozen
dependencies, `check`, and build/artifact validation.
Merging a PR does not itself publish anything.

For the existing npm CLI distribution, its `prepublishOnly` hook runs the root
`release:check`. Publish from a full repository checkout with development
dependencies installed; running `npm publish` actually publishes and needs
separate authorization. No publication is performed by validation.

`release:version` and `release:publish` commands are not applicable: plugin
versioning remains the existing manual metadata/changelog/tag procedure in the
README, and CLI publication remains the existing npm command. This repository
has no docs build or `docs:check` command.
