# @langsync/excel-engine

> Excel (.xlsx) import/export engine for LangSync, powered by
> [exceljs](https://github.com/exceljs/exceljs).

Internal package of the [LangSync](https://github.com/mariokreitz/langsync)
monorepo. Not published independently to npm; consumed by the `langsync` CLI.

## Public API

```ts
import { exportToExcel, importFromExcel } from '@langsync/excel-engine';
```

### `exportToExcel({ file, sheetName?, locales })`

Write every locale into a single workbook. Layout:

| key            | en    | de    |
| -------------- | ----- | ----- |
| greeting.hello | Hello | Hallo |

- Column A holds the flattened dot-notated key.
- Subsequent columns hold values per locale, in the order provided.
- Keys are sorted alphabetically.

### `importFromExcel(file, sheetName?)`

Read a workbook produced by `exportToExcel` (or any workbook with the same
layout) and return `{ locales: [{ locale, translations }, …] }`.

Throws when the named worksheet is not present.

## Testing

```bash
pnpm --filter @langsync/excel-engine test
```

Tests run round-trip against real temp files for full integration confidence.

## License

MIT
