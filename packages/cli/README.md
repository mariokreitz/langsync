# langsync

> Modern localization workflow tooling for TypeScript applications.

[![npm version](https://img.shields.io/npm/v/langsync.svg?style=flat-square&color=2563eb)](https://www.npmjs.com/package/langsync)
[![Node](https://img.shields.io/node/v/langsync?style=flat-square&color=2563eb)](https://nodejs.org)
[![License](https://img.shields.io/npm/l/langsync.svg?style=flat-square)](https://github.com/mariokreitz/langsync/blob/main/LICENSE)

LangSync is a fast, typed, framework-agnostic CLI that keeps your translation
files consistent across every locale and every collaborator — without the
chaos of hand-edited JSON or fragile Excel hand-offs.

- **Typed configuration** with `defineConfig()` and IntelliSense.
- **Bidirectional Excel I/O** for non-technical translators.
- **Strict validation** with CI-friendly exit codes and JSON output.
- **Auto-detected integrations** for `i18next`, `ngx-translate`, `react-intl`.
- **Interactive setup** that scaffolds your config and locale files.

## Install

```bash
pnpm add -D langsync
# or: npm install -D langsync
# or: yarn add -D langsync
```

> Requires **Node.js 22+** and an ESM-compatible project.

## Quick start

```bash
# 1. Scaffold typed config + locale stubs
npx langsync init

# 2. Check every locale against the reference
npx langsync validate

# 3. Add missing keys (empty placeholders) to non-reference locales
npx langsync sync

# 4. Hand off to translators via Excel
npx langsync export excel

# 5. Import their work back
npx langsync import excel
```

## Commands

| Command                 | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `langsync init`         | Initialize a typed `langsync.config.ts` and scaffold locale files.  |
| `langsync validate`     | Report missing, extra, and empty keys; exits non-zero on errors.    |
| `langsync find-missing` | Report missing keys per locale; exits non-zero on errors.           |
| `langsync sync`         | Synchronize keys from the reference locale into every other locale. |
| `langsync export excel` | Export all locales into a single `.xlsx` workbook.                  |
| `langsync import excel` | Import translations from a workbook back into JSON files.           |

All read commands support `--reporter json`. All write commands support
`--dry-run`.

## Configuration

```ts
// langsync.config.ts
import { defineConfig } from 'langsync';

export default defineConfig({
  input: './src/i18n',
  output: './translations',
  locales: ['en', 'de', 'fr'],
  defaultLocale: 'en',
  framework: 'i18next',
});
```

JSON, JS, and MJS configs are also supported via cosmiconfig.

## Documentation

Full documentation, including configuration reference, every CLI command,
and framework integration recipes:

**https://github.com/mariokreitz/langsync**

## License

[MIT](https://github.com/mariokreitz/langsync/blob/main/LICENSE) © Mario Kreitz
