---
allowed-tools: Bash(git tag:*), Bash(git push:*), Bash(gh workflow:*), Bash(gh run:*), Read, Edit, AskUserQuestion
description: Release a plugin with namespace@version tag
---

# Release Plugin Command

Release a specific plugin using the namespace@version tag pattern.

## Current Context

- Working directory: !`pwd`
- Current branch: !`git branch --show-current`
- Git status: !`git status --short`
- Available plugins: !`ls -1 plugins/`

## Your Task

Create a release for a specific plugin using the `<plugin-name>@<version>` tag pattern (e.g., `ni@1.0.0`).

## Prerequisites Verification

Before proceeding, verify:

1. **Clean working directory**: No uncommitted changes (unless they're the release commit itself)
2. **Correct branch**: On `main` branch (or ask user to confirm if on a different branch)
3. **All tests pass**: Run tests for the plugin being released

## Release Process

### Phase 1: Information Gathering

1. **List available plugins** from `plugins/` directory
2. **Ask user which plugin** to release (if not obvious from context)
3. **Read current version** from `plugins/<plugin>/package.json`
4. **Ask user for new version**:
   - Show current version
   - Suggest semver bumps:
     - Patch: `x.y.z → x.y.z+1` (bug fixes)
     - Minor: `x.y.z → x.y+1.0` (new features, backward compatible)
     - Major: `x.y.z → x+1.0.0` (breaking changes)
   - Allow custom version input
5. **Validate version**:
   - Must be valid semver (e.g., `1.0.0`, `2.1.0-beta.1`)
   - Check tag doesn't already exist: `git tag -l "<plugin>@<version>"`
6. **Ask for changelog entry** or offer to generate from recent commits

### Phase 2: Update Version Files

Update version in **exactly 3 files** (atomically):

1. **`plugins/<plugin>/package.json`**:
   ```json
   {
     "version": "<new-version>"
   }
   ```

2. **`plugins/<plugin>/.claude-plugin/plugin.json`**:
   ```json
   {
     "version": "<new-version>"
   }
   ```

3. **`.claude-plugin/marketplace.json`**:
   Update the specific plugin's version in the plugins array:
   ```json
   {
     "plugins": [
       {
         "name": "<plugin>",
         "version": "<new-version>",
         ...
       }
     ]
   }
   ```

### Phase 3: Update Changelog

1. **Check if plugin has its own CHANGELOG**:
   - If `plugins/<plugin>/CHANGELOG.md` exists, update it
   - Otherwise, update root `CHANGELOG.md` with plugin prefix

2. **Changelog format** (Keep a Changelog style):

   For **plugin-specific** CHANGELOG (`plugins/<plugin>/CHANGELOG.md`):
   ```markdown
   ## [<version>] - YYYY-MM-DD

   ### Added
   - New features

   ### Changed
   - Changes in existing functionality

   ### Fixed
   - Bug fixes
   ```

   For **root** CHANGELOG with prefix:
   ```markdown
   ## [<plugin>@<version>] - YYYY-MM-DD

   ### Added
   - New features

   ### Changed
   - Changes in existing functionality

   ### Fixed
   - Bug fixes
   ```

3. **Get today's date** for the changelog entry

### Phase 4: Create Release Commit and Tag

1. **Stage the changed files**:
   ```bash
   git add plugins/<plugin>/package.json \
           plugins/<plugin>/.claude-plugin/plugin.json \
           .claude-plugin/marketplace.json \
           plugins/<plugin>/CHANGELOG.md  # or CHANGELOG.md if using root
   ```

2. **Create release commit**:
   ```bash
   git commit -m "chore(release): <plugin>@<version>"
   ```

3. **Create annotated tag**:
   ```bash
   git tag -a "<plugin>@<version>" -m "Release <plugin>@<version>"
   ```

4. **Show what will be pushed** and ask for confirmation:
   - Show the commit
   - Show the tag
   - Explain that pushing the tag will trigger the release workflow

### Phase 5: Push and Monitor

1. **Push commit and tag**:
   ```bash
   git push origin main
   git push origin <plugin>@<version>
   ```

2. **Wait briefly** for GitHub Actions to register the workflow

3. **Get the workflow run**:
   ```bash
   gh run list --workflow=release.yml --limit=1
   ```

4. **Monitor the workflow** (show user the URL):
   ```bash
   gh run watch <run-id>
   ```
   Or provide the URL: `https://github.com/<owner>/<repo>/actions`

5. **When complete, get the release**:
   ```bash
   gh release view <plugin>@<version>
   ```

### Phase 6: Verification and Summary

1. **Verify release was created** on GitHub
2. **Check that the plugin tarball** exists in release assets
3. **Show the release URL** to the user
4. **Provide summary**:
   ```
   ✓ Released <plugin>@<version>

   Release: https://github.com/<owner>/<repo>/releases/tag/<plugin>@<version>

   Files released:
   - <plugin>-plugin.tar.gz
   - checksums.txt

   Next steps:
   - Users can install with: bun install.ts --plugins=<plugin>
   - Update documentation if needed
   ```

## Important Notes

- **NEVER** use `git commit --amend` for release commits
- **NEVER** force push (`git push --force`)
- **NEVER** skip hooks unless explicitly requested by user
- **Tag format MUST be** `<plugin-name>@<version>` (e.g., `ni@1.0.0`)
- **Always validate** version doesn't already exist before proceeding
- **Always ask for confirmation** before pushing (tags trigger CI/CD)
- **If workflow fails**, keep the tag and let user decide whether to:
  - Fix issues and re-run workflow manually
  - Delete tag and retry release

## Error Handling

- **If tag already exists**: Inform user and abort
- **If working directory is dirty**: Inform user to commit or stash changes
- **If not on main branch**: Ask user if they want to release from current branch
- **If tests fail**: Abort release and show test output
- **If workflow fails**: Show failure reason, provide workflow URL, don't auto-delete tag

## Examples

**Example 1: Patch release**
```
User: /release
Assistant: Which plugin would you like to release?
User: ni
Assistant: Current version: 1.0.0
          Suggested versions:
          - Patch (bug fixes): 1.0.1
          - Minor (new features): 1.1.0
          - Major (breaking changes): 2.0.0

          What version would you like to release?
User: 1.0.1
Assistant: [Updates files, creates changelog entry, commits, tags, pushes]
          ✓ Released ni@1.0.1
          Release: https://github.com/aryasaatvik/coding-agent-plugins/releases/tag/ni@1.0.1
```

**Example 2: Pre-release**
```
User: /release
Assistant: Which plugin would you like to release?
User: ni
Assistant: Current version: 1.0.0
          What version would you like to release?
User: 1.1.0-beta.1
Assistant: [Proceeds with pre-release]
          Note: This will be marked as a pre-release on GitHub
```
