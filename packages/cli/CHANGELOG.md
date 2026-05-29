# @mariokreitz/langsync

## 0.6.0

### Minor Changes

- 4730e15: Add namespace-aware CLI consumers for sync, validate, find-missing, translate, export, and import.

  Result shapes now preserve namespace context through `NamespacedValidationIssue`, `MissingEntry`, `TranslationEntry`, and export `namespaces` metadata.

### Patch Changes

- e70f8f2: Add the init layout prompt for single-file, locale-dir, and locale-prefix locale files, including namespaced scaffolding for initial namespace files.
- a74652c: excel-engine: namespace-aware export/import. Export emits a `namespace` column when any file has a namespace; import returns a `{ format, locales }` discriminator and reconstructs per-namespace trees. Single-file workbooks remain fully supported. NOTE: the excel-engine TypeScript contract changed (`ExportOptions.locales` → `files`; `ImportResult` adds `format` and `namespace`).

## 0.5.0

### Minor Changes

- bdcb351: **translate**: Add `--max-keys` flag, dry-run key preview, structured error type, and DeepL graduation.

  ### New features

  **`translate --max-keys <n>`**
  Limits the total number of keys translated per run. Keys are selected
  deterministically: target locales in config order, then reference keys in
  iteration order. Remaining keys are reported as skipped and not lost — run
  again to translate the next batch.

  ```sh
  langsync translate --max-keys 50
  ```

  **Dry-run key preview**
  `--dry-run` now shows a summary of what _would_ be translated before making
  any API calls:

  ```
  [dry-run] Would translate 47 keys across 3 locales using openai.
  [dry-run]   de: 20 key(s)
  [dry-run]   fr: 15 key(s)
  [dry-run]   es: 12 key(s)
  ```

  **`TranslationAdapterError`**
  A new structured error class exported from `@langsync/ai-engine`. Adapters now
  throw `TranslationAdapterError` with `provider` and `statusCode` fields. The
  CLI surfaces actionable messages for common status codes (e.g. 429 rate limit).

  **DeepL graduated to stable**
  `deepl` is no longer behind `LANGSYNC_AI_EXPERIMENTAL=1`. Use it directly:

  ```ts
  // langsync.config.ts
  ai: {
    provider: 'deepl';
  }
  ```

  Or via the flag:

  ```sh
  DEEPL_API_KEY=your_key langsync translate --provider deepl
  ```

  ### `RunTranslateResult` changes

  Two new fields are added to `RunTranslateResult`:
  - `skippedByLocale: Record<string, string[]>` — keys skipped due to `--max-keys`
  - `totalTranslatableKeys: number` — count of empty target keys before any cap

  ### `FillTranslationsResult` changes

  `fillEmptyTranslations` now returns:
  - `skippedKeys: string[]` — keys that were not translated due to `maxKeys`

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

- e3f6ebc: **sync**: Skip writing locale files that are already in sync with the reference.
  `runSync` now uses `diffTrees`/`hasChanges` before each write. Files with no
  changes are added to `unchanged` in the result and skipped entirely — no
  unnecessary disk I/O.

  **watch**: The watch summary now shows per-file change counts
  (`+2 keys, -1, ~3 changed`) and distinguishes between synced files and files
  that were already up to date.

  `RunSyncResult` gains two new fields:
  - `unchanged: string[]` — paths that were skipped (already in sync)
  - `diffsByPath: Record<string, TreeDiff>` — diff details for changed files,
    keyed by absolute file path

  `RunWatchPassResult` gains the same two fields, forwarded from `runSync`.

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

## 0.4.1

### Patch Changes

- e8dc279: Refresh the CLI README to match the current command set, documentation links, and AI provider availability notes.
- e8dc279: Accept `framework: 'none'` in the public config schema and tighten workflow security defaults.

## 0.4.0

### Minor Changes

- 3223fe8: Add AI translate support to the GitHub Action and a `--model` flag to
  `langsync translate`. The composite action gains `translate`, `ai-provider`,
  `ai-api-key`, `ai-model`, and `ai-dry-run` inputs; the translate step maps the
  key to the provider-specific env var and sets `LANGSYNC_AI_EXPERIMENTAL=1` so
  experimental providers work in CI. Translate is off by default; prefer
  `ai-dry-run: true` on pull-request checks to avoid unnecessary API costs.
- a7e3b13: Add DeepL, Anthropic, and Gemini AI translation adapters. All three implement
  the same `TranslationAdapter` interface and are fully tested, but remain gated
  behind `LANGSYNC_AI_EXPERIMENTAL=1` until each graduates to released after
  smoke-testing. DeepL auto-detects the free (`api-free.deepl.com`) vs. pro
  (`api.deepl.com`) endpoint from the `:fx` key suffix, with a `useFreeTier`
  override.

## 0.3.0

### Minor Changes

- 9ae0326: Add V2 features: `langsync translate` (AI-assisted translation with a pluggable
  provider adapter — OpenAI released; DeepL, Anthropic, and Gemini behind a flag)
  and `langsync watch` (incremental sync + validation on file change). Adds `ai`
  configuration options and a composite GitHub Action for `validate` in CI.

### Patch Changes

- 9ae0326: Detect `i18next-vue` (the maintained Vue 3 binding for i18next) during
  `langsync init`, alongside the existing `i18next` / `react-i18next` /
  `vue-i18next` signatures.

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
  - @langsync/excel-engine@0.1.0
  - @langsync/shared@0.1.0
