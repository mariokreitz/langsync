# @mariokreitz/langsync

> Modern localization workflow tooling for TypeScript applications.

[![npm version](https://img.shields.io/npm/v/@mariokreitz/langsync.svg?style=flat-square&color=2563eb)](https://www.npmjs.com/package/@mariokreitz/langsync)
[![Node](https://img.shields.io/node/v/@mariokreitz/langsync?style=flat-square&color=2563eb)](https://nodejs.org)
[![License](https://img.shields.io/npm/l/@mariokreitz/langsync.svg?style=flat-square)](https://github.com/mariokreitz/langsync/blob/main/LICENSE)

LangSync is a fast, typed, framework-agnostic CLI that keeps your translation
files consistent across every locale and every collaborator — without the
chaos of hand-edited JSON or fragile Excel hand-offs.

- **Typed configuration** with `defineConfig()` and IntelliSense.
- **Bidirectional Excel I/O** for non-technical translators.
- **Strict validation** with CI-friendly exit codes and JSON output.
- **Auto-detected integrations** for `i18next`, `ngx-translate`, `react-intl`.
- **Interactive setup** that scaffolds your config and locale files.

## Install

<!-- embedme ../../docs/shared/install.sh -->

```bash
pnpm add -D @mariokreitz/langsync
# or
npm install -D @mariokreitz/langsync
# or
yarn add -D @mariokreitz/langsync


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

# 4. Optionally fill the gaps with AI
npx langsync translate

# 5. Hand off to translators via Excel
npx langsync export excel

# 6. Import their work back
npx langsync import excel
```

## Commands

| Command                 | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `langsync init`         | Initialize a typed `langsync.config.ts` and scaffold locale files.  |
| `langsync validate`     | Report missing, extra, and empty keys; exits non-zero on errors.    |
| `langsync find-missing` | Report missing keys per locale; exits non-zero on errors.           |
| `langsync sync`         | Synchronize keys from the reference locale into every other locale. |
| `langsync translate`    | Fill empty values in non-reference locales using an AI provider.    |
| `langsync watch`        | Watch locale files and run incremental sync + validation on change. |
| `langsync export excel` | Export all locales into a single `.xlsx` workbook.                  |
| `langsync import excel` | Import translations from a workbook back into JSON files.           |

All read commands support `--reporter json`. All write commands support
`--dry-run`.

## Configuration

<!-- embedme ../../docs/shared/config.ts -->

```ts
import { defineConfig } from '@mariokreitz/langsync';

export default defineConfig({
  input: './src/i18n',
  output: './translations',
  locales: ['en', 'de', 'fr'],
  defaultLocale: 'en',
  framework: 'i18next',
  excel: {
    file: 'translations.xlsx',
    sheetName: 'Translations',
  },
  ai: {
    provider: 'openai',
    model: 'gpt-5-mini',
  },
});
```

JSON, JS, and MJS configs are also supported via cosmiconfig. Omit `framework`
or set `framework: 'none'` for custom setups.

## Documentation

Full documentation, including configuration reference, every CLI command,
and framework integration recipes:

**https://github.com/mariokreitz/langsync**

## License

[MIT](https://github.com/mariokreitz/langsync/blob/main/LICENSE) © Mario Kreitz
