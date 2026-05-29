# @langsync/shared

## 0.2.0

### Minor Changes

- d19d177: **config**: `output` is now optional in `defineConfig()` and `langsync.config.ts`.

  Previously, `output` was a required field in the schema, which forced every
  user to specify a path that no current command actually uses at runtime.

  Changes:
  - `output` has a default of `"./translations"` — existing configs that include
    it explicitly continue to work unchanged.
  - A new `LangSyncConfigInput` type is exported from both `@langsync/shared` and
    `@mariokreitz/langsync`. This is the _authoring_ type (`z.input<Schema>`)
    where `output` is genuinely optional. `LangSyncConfig` remains the runtime
    type (`z.infer<Schema>`) with all defaults applied.
  - `defineConfig()` now accepts `LangSyncConfigInput` so TypeScript correctly
    marks `output` as optional in config files.
  - `loadConfig()` now uses `safeParse` and throws a human-friendly error
    message when the config is invalid (instead of an opaque Zod error dump).

  **Migration:** No changes needed to existing configs. To take advantage of the
  simplified minimum config:

  ```ts
  // Before
  export default defineConfig({
    input: './src/i18n',
    output: './translations', // was required
    locales: ['en', 'de'],
  });

  // After — output can be omitted
  export default defineConfig({
    input: './src/i18n',
    locales: ['en', 'de'],
  });
  ```

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

- 9d7c395: Fix Prettier formatting in config schema test file

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
