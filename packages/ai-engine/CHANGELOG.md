# @langsync/ai-engine

## 0.2.0

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

### Patch Changes

- Updated dependencies [d19d177]
- Updated dependencies [d1ab37a]
- Updated dependencies [9d7c395]
  - @langsync/shared@0.2.0
  - @langsync/core@0.1.1
