# Contributing to LangSync

Thanks for your interest in contributing! This document covers the conventions, tooling, and constraints of the LangSync monorepo.

## Requirements

- Node.js **>= 22** (see `.nvmrc`)
- pnpm **>= 11**

## Getting started

```bash
pnpm install
pnpm build
pnpm test
```

## Monorepo layout

```
apps/
  docs/                # Documentation site (Fumadocs)

packages/
  cli/                 # The `langsync` CLI (public, published)
  core/                # Parsers, validators, sync + incremental engine
  excel-engine/        # Excel import/export
  ai-engine/           # AI translation adapters (OpenAI, DeepL, Anthropic, Gemini)
  github-action/       # Composite GitHub Action wrapping `validate`
  shared/              # Logger, fs, config, types
```

## Conventions

### ESM-first

The entire codebase is **pure ESM**. With `"module": "NodeNext"`, every relative import **must use the `.js` extension**, even in `.ts` source files:

```ts
// ✅ Correct
import { logger } from './logger/index.js';

// ❌ Wrong — will fail at runtime
import { logger } from './logger/index';
import { logger } from './logger';
```

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/). Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

The `commit-msg` hook (via husky + commitlint) enforces this.

### Changesets

Any user-facing change to a published package **must** include a changeset:

```bash
pnpm changeset
```

### Versioning (single source of truth)

There is exactly **one** place a package version is maintained: the `version`
field in that package's `package.json`. **Never hand-edit a version anywhere
else.**

- **Bumping** is automated by Changesets. `pnpm changeset` records intent,
  `pnpm version` (which runs `changeset version`) applies the bumps and updates
  changelogs, and `pnpm release` publishes.
- **The CLI version** (`langsync --version` and the startup banner) is **not**
  hand-written. It is injected at build time from `packages/cli/package.json`
  via tsup's `define` (`__LANGSYNC_VERSION__` in `tsup.config.ts`). Change the
  `package.json` version — through Changesets — and the binary follows
  automatically.
- **Docs** intentionally avoid pinning an exact patch version in sample output
  (e.g. `v0.2.x`) so they never drift.
- **The GitHub Action** defaults to `version: latest`; pin a specific version in
  your workflow only if you need to.

### Dependency policy

- **NEVER add `xlsx` (SheetJS).** It was relicensed to AGPL in 2023 and is incompatible with our MIT license. Use [`exceljs`](https://github.com/exceljs/exceljs) instead — it's already in the catalog.
- Add shared third-party deps to the **catalog** in `pnpm-workspace.yaml`, then reference them with `"chalk": "catalog:"` in each package's `package.json` to prevent version drift.

## Scripts

| Command          | Description                                              |
| ---------------- | -------------------------------------------------------- |
| `pnpm build`     | Build all packages via Turbo                             |
| `pnpm dev`       | Run all packages in watch mode                           |
| `pnpm lint`      | Lint all packages                                        |
| `pnpm typecheck` | Type-check all packages                                  |
| `pnpm test`      | Run all tests                                            |
| `pnpm format`    | Embed shared README fragments, then format with Prettier |
| `pnpm changeset` | Create a new changeset                                   |

## README & docs sync

The install and config snippets in `README.md` and `packages/cli/README.md`
are embedded from single-source fragments in `docs/shared/` via
[`embedme`](https://github.com/zakhenry/embedme). Edit the fragment, not the
embedded block, then run `pnpm format`. CI runs `pnpm format:check` (which
calls `embedme --verify`), so stale embeds fail the build.

## Branch model & CI pipeline

### Branches

| Branch                          | Purpose                                              |
| ------------------------------- | ---------------------------------------------------- |
| `main`                          | Always releasable. Protected — no direct push.       |
| `feat/*`, `fix/*`, `chore/*`, … | Feature / fix branches. Open a PR into `main`.       |
| `changeset-release/*`           | Automated by the Changesets action — do not edit it. |

### What runs on every PR

| Check                     | Job name              | Description                                      |
| ------------------------- | --------------------- | ------------------------------------------------ |
| Format (embed + Prettier) | `Format check`        | Stale embeds or unformatted files fail here      |
| Build                     | `Build`               | Compiles all packages, warms the Turbo cache     |
| Typecheck                 | `Typecheck`           | `tsc --noEmit` across all packages               |
| Lint                      | `Lint`                | ESLint across all packages                       |
| Tests + coverage          | `Test`                | vitest + Codecov upload                          |
| Changeset present         | `Changeset check`     | Fails if source changed but no `.changeset/*.md` |
| Conventional commits      | `Commit message lint` | Runs commitlint over every commit in the PR      |
| Coverage (patch)          | `codecov/patch`       | New code must reach >= 90% line coverage         |

### Required status checks for branch protection on `main`

In **Settings → Branches → `main` → Require status checks to pass**, add these
exact names:

```
Format check
Build
Typecheck
Lint
Test
Changeset check
Commit message lint
codecov/patch
```

Also enable: "Require branches to be up to date before merging", "Require a pull
request before merging", and "Do not allow bypassing the above settings".

### Automated release flow

On every merge to `main` the Changesets action either:

- **Opens / updates** a PR titled `chore: version packages` (runs `pnpm version`,
  bumps each `package.json`, updates changelogs), or
- **Publishes to npm** and pushes a git tag once that version PR is merged.

You never manually run `pnpm release` or cut a GitHub Release — Changesets does
it. The only one-time manual setup is the branch protection rule above; the
required tokens (`NPM_TOKEN`, `CODECOV_TOKEN`) and write-permission settings are
already configured.
