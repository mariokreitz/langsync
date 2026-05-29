# GitHub Copilot Instructions for LangSync

These instructions apply to the entire repository. Follow them for every code
suggestion, edit, and review in this workspace. They encode the project's
architecture, coding standards, and quality gates so generated code fits the
codebase on the first try.

## Project overview

LangSync is **modern localization workflow tooling for TypeScript
applications**. It is a TurboRepo + pnpm monorepo, pure ESM, targeting
**Node.js 22+**.

```
apps/
  docs/            # Documentation site (Fumadocs)
packages/
  cli/             # The `langsync` CLI (published to npm as @mariokreitz/langsync)
  core/            # Parsers, validators, sync engine (pure, no I/O)
  excel-engine/    # Excel (xlsx) import/export via exceljs
  ai-engine/       # AI translation adapters (OpenAI, DeepL, Anthropic, Gemini)
  shared/          # Types, config loader (zod + cosmiconfig), logger, fs helpers
```

## Tech stack

- **Language:** TypeScript (strict), `module: NodeNext`, `verbatimModuleSyntax`.
- **Package manager:** pnpm with a shared **catalog** in `pnpm-workspace.yaml`.
- **Build:** tsup (ESM only). **Test:** vitest + v8 coverage.
- **CLI libs:** commander, chalk, ora, prompts, listr2.
- **Validation/config:** zod, cosmiconfig.

## Hard rules

1. **ESM-first.** Every relative import MUST use the `.js` extension, even in
   `.ts` source files: `import { logger } from './logger/index.js'`.
2. **Type-only imports** use `import { type Foo }` (enforced by
   `verbatimModuleSyntax`).
3. **NEVER add `xlsx` (SheetJS).** It is AGPL since 2023 and incompatible with
   our MIT license. Use `exceljs` (already in the catalog).
4. **Shared third-party deps go in the catalog** (`pnpm-workspace.yaml`) and are
   referenced as `"pkg": "catalog:"`. Do not pin versions per package.
5. **No emojis in docs** (`apps/docs/**`) or in user-facing CLI output.
6. **`core` and `ai-engine` adapters stay pure** — no direct filesystem or
   process access. I/O belongs in `cli` command handlers and `shared/fs`.

## Clean Code principles

Apply these deliberately; prefer clarity over cleverness.

- **DRY** — Extract shared logic into `shared` (cross-package) or a local helper
  (within a package). The `loadLocaleFiles` / `writeJson` helpers in
  `shared/fs` are the canonical reuse point for locale I/O. Never re-implement
  flatten/unflatten — import from `@langsync/core`.
- **KISS** — Favor small, obvious functions. A CLI command handler should
  orchestrate, not contain business logic. Push logic into a testable
  `run.ts` (see `commands/sync/run.ts`).
- **SOLID**
  - **S**ingle Responsibility: one module = one concern (parsing, validation,
    sync, excel, ai). Keep `cli` thin.
  - **O**pen/Closed: extend behavior via new modules/adapters, not by editing
    stable cores. New AI providers are new `TranslationAdapter` implementations,
    not `switch` edits scattered around.
  - **L**iskov: every adapter fully honors its interface contract.
  - **I**nterface Segregation: keep interfaces focused
    (e.g. `TranslationAdapter` only translates).
  - **D**ependency Inversion: command handlers depend on engine interfaces, not
    concrete providers; inject dependencies so they can be mocked in tests.

## Architecture conventions

- **CLI command pattern:** each command lives in
  `packages/cli/src/commands/<name>.ts` (the commander registration) plus
  `packages/cli/src/commands/<name>/run.ts` (the testable, side-effect-light
  action). The registration file handles argument parsing, logging, and exit
  codes; `run.ts` does the orchestration and returns a result object.
- **Exit codes:** read commands (`validate`, `find-missing`) exit `1` on
  `missing`/`extra` issues. On any thrown error, set `process.exitCode = 1` and
  log via `logger.error`.
- **Config:** extend `LangSyncConfigSchema` in `shared/src/config/index.ts` with
  zod; add a `.describe()` to every new field and document it in both READMEs
  and the docs site.
- **Reusable engine logic** that the CLI, watch mode, and the GitHub Action all
  need belongs in `core` / `shared`, never inside a command handler.

## Testing requirements (TDD)

- **Write tests first.** Co-locate as `*.test.ts` next to the source.
- Mock `@langsync/shared/config` and `@langsync/shared/fs` in command tests
  (see `commands/sync/run.test.ts`). Use `memfs` for fs-level unit tests.
- AI adapters are tested with **mocked HTTP/SDK clients** — never hit a real API
  in tests.
- Excel is tested via a **real temp-file round-trip**.
- Target **>= 90% line coverage** for new packages and command handlers.
- Every package's `vitest.config.ts` emits `['text', 'html', 'lcov']` so
  Codecov can ingest `coverage/lcov.info`.

## Documentation requirements

Documentation is part of "done". For every user-facing change:

1. Update the relevant page under `apps/docs/content/docs/`.
2. Update the **shared README fragments** under `docs/shared/` — these are the
   single source of truth embedded (via `embedme`) into both `README.md` (repo)
   and `packages/cli/README.md` (npm). Do **not** hand-edit the embedded blocks;
   edit the fragment and run `pnpm format`.
3. Keep `packages/cli/package.json` (`description`, `keywords`) consistent with
   the READMEs. **Never hand-edit a `version`** — it is the single source of
   truth in each `package.json`, bumped only via Changesets. The CLI's
   `--version`/banner is injected from `package.json` at build time
   (`__LANGSYNC_VERSION__` in `tsup.config.ts`), so it must never be hardcoded.
4. Add a **changeset** (`pnpm changeset`) for any change to a published package.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/). Allowed types:
`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore`, `revert`. The `commit-msg` husky hook enforces this.

## Definition of done

- [ ] Tests written first and passing with >= 90% coverage on new code.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` all green.
- [ ] Docs page(s) and shared README fragment(s) updated; `pnpm format` run.
- [ ] No emojis in docs/CLI output; ESM `.js` import extensions everywhere.
- [ ] Changeset added for published-package changes.
