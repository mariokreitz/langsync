# @langsync/excel-engine

> Excel (.xlsx) import/export engine for LangSync, powered by
> [exceljs](https://github.com/exceljs/exceljs).

Internal package of the [LangSync](https://github.com/mariokreitz/langsync)
monorepo. Not published independently to npm; consumed by the `langsync` CLI.

## Public API

```ts
import { exportToExcel, importFromExcel } from '@langsync/excel-engine';
```

### `exportToExcel({ file, sheetName?, files })`

Write a set of `NamespacedFile`s (`{ locale, namespace, translations }`) into a
single workbook. All entries must be uniformly single-file (`namespace: null`)
or uniformly namespaced — mixing throws.

Single-file layout:

| key            | en    | de    |
| -------------- | ----- | ----- |
| greeting.hello | Hello | Hallo |

Namespaced layout (adds a leading `namespace` column):

| namespace | key   | en    | de    |
| --------- | ----- | ----- | ----- |
| common    | hello | Hello | Hallo |

- Value columns are emitted per locale, in the order provided.
- Keys (and `(namespace, key)` rows) are sorted alphabetically.

### `importFromExcel(file, sheetName?)`

Read a workbook produced by `exportToExcel` (or any workbook with the same
layout) and return an `ImportResult`:

```ts
{ format: 'single-file' | 'namespaced', locales: NamespacedFile[] }
```

The `format` is detected from the header row (a leading `namespace` column means
namespaced). Throws when the named worksheet is not present, when a namespaced
workbook has an empty `namespace` cell, or when a duplicate `(namespace, key)`
row is found.

## Testing

```bash
pnpm --filter @langsync/excel-engine test
```

Tests run round-trip against real temp files for full integration confidence.

## License

MIT
