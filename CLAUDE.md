# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

QArness is a QA harness that installs skills and agents into AI coding assistants (OpenCode, Claude Code). The codebase was migrated from bash/PowerShell to a TypeScript + Bun setup with a data-driven installer.

## Common commands

```bash
# Install dependencies
bun install

# Run all tests
bun test

# Run only unit tests (no Docker needed, fast)
bun test tests/unit/

# Run integration tests (requires Docker)
bun test tests/installer.test.ts

# Run a single test file
bun test tests/unit/cli.test.ts

# Type-check / compile check
bun build --no-bundle install.ts
bun build --no-bundle uninstall.ts

# Compile CLI to binary
bun run build:cli

# Run installer locally
bun install.ts
bun install.ts --yes --hosts claude --json
```

## Architecture

### Installer flow (install.ts)

1. **Detect hosts** — `HOSTS` array in `src/installer/hosts.ts`; each host has a `detect()` function checking if the AI tool's directory exists
2. **Select hosts/features** — CLI args (`--yes`, `--hosts`, `--features`) or interactive `@clack/prompts` multiselect
3. **Install hosts** — `installHost()` copies skills/agents from `REPO_ROOT` to the host's target dir, then runs `postInstall()` to modify config files
4. **Install features** — `FEATURES` in `src/installer/features.ts`; currently only `xmind-mcp` (npm install)
5. **Write manifest** — `~/.qarness/manifest.json` tracks all installed files, enabling clean uninstall

### Host configuration (src/installer/hosts.ts)

Each host is a data object, not a separate module. Adding a new host means adding an entry to the `HOSTS` array:

```typescript
type HostConfig = {
  id: string                    // "opencode", "claude"
  name: string
  detect: () => boolean         // Check if host directory exists
  targetDir: () => string       // Where to install
  sources: Record<string, SourceMapping>  // What to copy (from REPO_ROOT)
  postInstall?: (targetDir: string) => Promise<void>    // Modify configs
  postUninstall?: (targetDir: string) => Promise<void>  // Clean up configs
}
```

Key detail: `installHost()` copies from `REPO_ROOT/<mapping.from>` to `targetDir/<mapping.from>`. The `REPO_ROOT` is resolved once at import time in `utils.ts` via `import.meta.dir`.

### File copying (src/installer/utils.ts)

`copyDir()` is a manual recursive copy (stat + mkdir + readFile/writeFile), **not** Bun's `cp`. This was changed because Bun's `cp` on Windows had EPERM issues across certain paths.

### CLI (src/cli/index.ts)

Lazy-loads command modules via dynamic `import()`. Each command in `src/cli/commands/*.ts` exports a single function (e.g., `cmdStatus`, `cmdDoctor`).

### Manifest system (src/installer/manifest.ts)

`~/.qarness/manifest.json` is the single source of truth. `readManifest()` returns `null` if missing or corrupt. `writeManifest()` creates the `.qarness/` directory as needed. The manifest records per-host installed files and per-feature install status.

### Uninstall (uninstall.ts + install.ts --uninstall)

Reads the manifest, removes files per host (directories with trailing `/` via `rm -rf`, files via `unlink`), calls `postUninstall()` to clean config modifications, then deletes the manifest.

## Test structure

- `tests/unit/` — pure logic tests, no Docker. Each file mirrors a source module (cli.test.ts → cli.ts, manifest.test.ts → manifest.ts)
- `tests/installer.test.ts` — Docker-based integration: spins up `ubuntu:22.04`, runs full install → verify → uninstall cycle for OpenCode, Claude Code, and both combined. Uses `docker` CLI directly (not dockerode) for Windows compatibility

Unit tests that test `installHost()` create temp directories inside the actual `REPO_ROOT` and clean them up. This is because `installHost()` references `REPO_ROOT` from `utils.ts` and can't be redirected. The `REPO_ROOT` constant is module-level and can't be mocked without Bun's module mocking.

## Key patterns

- **Data-driven**: add hosts/features by adding entries to `HOSTS`/`FEATURES` arrays, no new code paths needed
- **Top-level await**: `utils.ts` uses top-level await for `VERSION` — Bun supports this, but it means importing `utils.ts` blocks
- **Rollback**: `installHost()` tracks `createdPaths` and removes them in reverse order if any step fails
- **Platform handling**: tests account for Windows `\` vs Unix `/` path separators using `sep` from `node:path`
