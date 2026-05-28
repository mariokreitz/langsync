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
  core/                # Parsers, validators, sync engine
  excel-engine/        # Excel import/export
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

### Dependency policy

- **NEVER add `xlsx` (SheetJS).** It was relicensed to AGPL in 2023 and is incompatible with our MIT license. Use [`exceljs`](https://github.com/exceljs/exceljs) instead — it's already in the catalog.
- Add shared third-party deps to the **catalog** in `pnpm-workspace.yaml`, then reference them with `"chalk": "catalog:"` in each package's `package.json` to prevent version drift.

## Scripts

| Command          | Description                    |
| ---------------- | ------------------------------ |
| `pnpm build`     | Build all packages via Turbo   |
| `pnpm dev`       | Run all packages in watch mode |
| `pnpm lint`      | Lint all packages              |
| `pnpm typecheck` | Type-check all packages        |
| `pnpm test`      | Run all tests                  |
| `pnpm format`    | Format all files with Prettier |
| `pnpm changeset` | Create a new changeset         |
