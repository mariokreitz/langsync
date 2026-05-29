<div align="center">

<img width="898" height="251" alt="image" src="https://github.com/user-attachments/assets/828625ad-9e97-4d25-bc0b-0cfc78659ffa" />

**Modern localization workflow tooling for TypeScript applications.**

Sync translations between developers, translators, and Excel — without chaos.

[![npm version](https://img.shields.io/npm/v/@mariokreitz/langsync.svg?style=flat-square&color=2563eb)](https://www.npmjs.com/package/@mariokreitz/langsync)
[![CI](https://img.shields.io/github/actions/workflow/status/mariokreitz/langsync/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/mariokreitz/langsync/actions/workflows/ci.yml)
[![codecov](https://img.shields.io/codecov/c/github/mariokreitz/langsync?style=flat-square)](https://codecov.io/gh/mariokreitz/langsync)
[![Node](https://img.shields.io/node/v/@mariokreitz/langsync?style=flat-square&color=2563eb)](https://nodejs.org)
[![License](https://img.shields.io/npm/l/@mariokreitz/langsync.svg?style=flat-square)](./LICENSE)

[Documentation](#documentation) ·
[Getting Started](#getting-started) ·
[CLI Reference](#cli-reference) ·
[Configuration](#configuration) ·
[Contributing](./CONTRIBUTING.md)

</div>

---

## Why LangSync

Localization in modern TypeScript projects shouldn't mean wrestling with
hand-edited JSON, mismatched keys, or fragile Excel hand-offs. LangSync gives
you a fast, typed, framework-agnostic CLI that keeps your translation files
consistent across every locale and every collaborator.

- **Typed configuration** — author `langsync.config.ts` with full IntelliSense.
- **Zero-friction Excel I/O** — round-trip translations with non-technical translators.
- **Strict validation** — fail CI when a locale drifts.
- **Framework integrations** — drop-in support for `i18next`, `ngx-translate`, and `react-intl`.
- **Beautiful terminal UX** — interactive prompts, spinners, and structured output.
- **CI-ready** — JSON reporters and proper exit codes for every command.

---

## Getting Started

### Install

<!-- embedme docs/shared/install.sh -->

```bash
pnpm add -D @mariokreitz/langsync
# or
npm install -D @mariokreitz/langsync
# or
yarn add -D @mariokreitz/langsync


```

> Requires **Node.js 22+** and an ESM-compatible project.

### Initialize

Run the interactive setup. LangSync detects your i18n framework from
`package.json`, scaffolds `langsync.config.ts`, and creates per-locale stubs.

```bash
npx langsync init
```

### Validate

Check every configured locale against the reference locale.

```bash
npx langsync validate
```

### Sync

Pull every key from the reference locale into the rest, preserving existing
translations and inserting empty placeholders for new keys.

```bash
npx langsync sync
```

---

## CLI Reference

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

All read commands support `--reporter json` for CI integrations. All write
commands support `--dry-run` for safe previews.

---

## Configuration

Create a `langsync.config.ts` at the project root:

<!-- embedme docs/shared/config.ts -->

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

| Option            | Type       | Required | Description                                      |
| ----------------- | ---------- | -------- | ------------------------------------------------ |
| `input`           | `string`   | yes      | Path to the source i18n directory.               |
| `output`          | `string`   | yes      | Path to the output / translations directory.     |
| `locales`         | `string[]` | yes      | List of supported locales.                       |
| `defaultLocale`   | `string`   | no       | Reference locale used for validation and sync.   |
| `framework`       | `string`   | no       | One of `i18next`, `ngx-translate`, `react-intl`. |
| `excel.file`      | `string`   | no       | Excel filename (default `translations.xlsx`).    |
| `excel.sheetName` | `string`   | no       | Worksheet name (default `Translations`).         |
| `ai.provider`     | `string`   | no       | One of `openai`, `deepl`, `anthropic`, `gemini`. |
| `ai.apiKey`       | `string`   | no       | API key (falls back to a provider env var).      |
| `ai.model`        | `string`   | no       | Provider model id (e.g. `gpt-5-mini`).           |

JSON, JS, and MJS config files are also supported via cosmiconfig.

---

## Framework Integrations

LangSync auto-detects the following i18n libraries during `langsync init`:

- **i18next** (incl. `react-i18next`, `vue-i18next`)
- **ngx-translate** (Angular)
- **react-intl** / `@formatjs/intl`

Omit `framework` or set `framework: 'none'` for custom setups.

---

## CI Usage

```yaml
- name: Validate translations
  run: npx langsync validate --reporter json
```

`validate` and `find-missing` exit with code `1` on `missing` or `extra`
issues, making them safe drop-ins for pull-request checks.

---

## Documentation

The full documentation site (built with [Fumadocs](https://fumadocs.dev))
lives under [`apps/docs`](./apps/docs) and covers configuration, every CLI
command, and framework integration recipes.

```bash
pnpm --filter @langsync/docs dev
```

---

## Project Structure

LangSync is a TurboRepo monorepo of small, focused packages:

```
packages/
  cli/            # The `langsync` CLI (published to npm)
  core/           # Parsers, validators, sync engine
  excel-engine/   # Excel (xlsx) import/export
  ai-engine/      # AI translation adapters (OpenAI, DeepL, Anthropic, Gemini)
  shared/         # Types, config loader, fs helpers, logger
apps/
  docs/           # Documentation site
```

---

## Roadmap

V1 shipped the full local workflow: init, validate, sync, find-missing, Excel
I/O, and framework detection.

V2 (current) adds:

- AI-assisted translation (`langsync translate`) with pluggable providers
  (OpenAI first; DeepL, Anthropic, and Gemini follow).
- Watch mode and incremental sync (`langsync watch`).
- A reusable composite GitHub Action for `validate` and `find-missing`.

Future releases will add:

- A VSCode extension
- A web dashboard for translator collaboration

---

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md)
for development setup, testing conventions, and the commit-message policy.

---

## License

[MIT](./LICENSE) © Mario Kreitz
