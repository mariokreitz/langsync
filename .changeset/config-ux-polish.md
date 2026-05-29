---
'@langsync/shared': minor
'@mariokreitz/langsync': minor
---

**config**: `output` is now optional in `defineConfig()` and `langsync.config.ts`.

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
