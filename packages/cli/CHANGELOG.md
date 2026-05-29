# @mariokreitz/langsync

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
