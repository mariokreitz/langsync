# @langsync/shared

> Shared utilities for LangSync — types, config loader, logger, and fs helpers.

Internal package of the [LangSync](https://github.com/mariokreitz/langsync)
monorepo. Not published independently to npm; consumed by every other
workspace package.

## Subpath exports

```ts
import { logger } from '@langsync/shared/logger';
import { loadConfig, defineConfig, LangSyncConfigSchema } from '@langsync/shared/config';
import { loadLocaleFiles, readJson, writeJson, pathExists } from '@langsync/shared/fs';
import type { Locale, LocaleFile, TranslationTree, I18nFramework } from '@langsync/shared/types';
```

### `logger`

A chalk-coloured logger with `info`, `success`, `warn`, `error`, and
debug-gated `debug` methods. Used by every CLI command.

### `loadConfig(cwd?)`

Discover and validate a LangSync config via
[cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) (`.ts`, `.js`,
`.mjs`, `.json`, `.langsyncrc`, or `package.json#langsync`). Returns `null`
when no config is found.

### `defineConfig(config)`

Identity helper for typed `langsync.config.ts` authoring.

### `loadLocaleFiles({ cwd, inputDir, locales })`

Load every configured locale file from `<inputDir>/<locale>.json`. Missing
files are returned as empty trees so downstream tooling can still operate on
a complete locale list.

### `readJson`, `writeJson`, `pathExists`

Thin promise-based filesystem helpers used by the CLI.

## Testing

```bash
pnpm --filter @langsync/shared test
```

## License

MIT
