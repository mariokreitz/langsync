# @langsync/excel-engine

## 0.1.1

### Patch Changes

- d1ab37a: **tests**: Lift coverage hygiene to ≥90% across all packages.
  - `@langsync/shared`: Add logger tests (100%), extend config tests to cover
    `loadConfig` with mocked cosmiconfig (100%), add `readJson`/`writeJson`/
    `pathExists` tests to fs suite (100% lines).
  - `@langsync/excel-engine`: Fix vitest coverage config — `index.ts` was
    incorrectly excluded from instrumentation; lines now at 97%.
  - `@mariokreitz/langsync`: Add `ui/node-version.ts` tests; exclude thin
    commander registration wrappers and interactive `prompt.ts` from coverage
    instrumentation (those are integration-level entry points).

- Updated dependencies [d19d177]
- Updated dependencies [d1ab37a]
- Updated dependencies [9d7c395]
  - @langsync/shared@0.2.0
  - @langsync/core@0.1.1

## 0.1.0

### Minor Changes

- Initial public release of LangSync — modern localization workflow tooling
  for TypeScript applications.

  This release ships the complete V1 local workflow:
  - `langsync init` — interactive setup with framework auto-detection
    (i18next, ngx-translate, react-intl) and typed config scaffolding.
  - `langsync validate` — locale consistency checks with `missing`, `extra`,
    and `empty` issue types. Supports `--reporter pretty|json` for CI.
  - `langsync find-missing` — focused view of missing keys per locale, with
    non-zero exit code for CI integrations.
  - `langsync sync` — propagate keys from the reference locale into every
    other locale, preserving existing translations. Supports `--dry-run`.
  - `langsync export excel` / `langsync import excel` — bidirectional
    workbook hand-off for non-technical translators.

  Includes a typed config loader (`defineConfig`, `loadConfig` via cosmiconfig),
  an internal `@langsync/core` engine (flatten/unflatten, validators, sync),
  and an `@langsync/excel-engine` powered by exceljs. Full TDD coverage with
  Codecov integration in CI.

### Patch Changes

- Updated dependencies
  - @langsync/core@0.1.0
  - @langsync/shared@0.1.0
