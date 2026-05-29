# @langsync/shared

> Shared utilities for LangSync — types, config loader, logger, and fs helpers.

Internal package of the [LangSync](https://github.com/mariokreitz/langsync)
monorepo. Not published independently to npm; consumed by every other
workspace package.

## Subpath exports

```ts
import { logger } from '@langsync/shared/logger';
import { loadConfig, defineConfig, LangSyncConfigSchema } from '@langsync/shared/config';
import {
  loadLocaleFiles,
  resolveLocaleFilePath,
  indexLocaleFiles,
  readJson,
  writeJson,
  pathExists,
} from '@langsync/shared/fs';
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

### `loadLocaleFiles({ cwd, inputDir, locales, namespaces? })`

Load every configured locale file. In the default single-file mode it reads
`<inputDir>/<locale>.json`. When `namespaces` is set, it loads per-namespace
files using the `locale-dir` (`<inputDir>/<locale>/<namespace>.json`) or
`locale-prefix` (`<inputDir>/<locale>.<namespace>.json`) structure, and
synthesizes empty entries so every locale exposes the full namespace set.
Returned files are `LoadedLocaleFile`s (each carries `namespace` and an
`exists` flag); missing files are returned as empty trees so downstream
tooling can still operate on a complete locale list.

### `resolveLocaleFilePath({ cwd, inputDir, locale, namespace, namespaces? })`

Resolve the on-disk path for a given locale/namespace, validating the
namespace (rejects empty, absolute, backslash, `/`-containing locale-prefix,
and `.`/`..` traversal segments) and guaranteeing the path stays within the
input directory.

### `indexLocaleFiles(files)`

Build a `LocaleFileIndex` from loaded files: the flat `files` list, the sorted
`namespaces` set, and a `byLocale` lookup keyed by locale then namespace.

### `readJson`, `writeJson`, `pathExists`

Thin promise-based filesystem helpers used by the CLI.

## Testing

```bash
pnpm --filter @langsync/shared test
```

## License

MIT
