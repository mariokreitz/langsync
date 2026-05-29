# @langsync/ai-engine

> AI translation adapters for LangSync.

Provider-agnostic translation backends used by `langsync translate`. Each
provider implements a single `TranslationAdapter` interface, so new providers
are added without touching existing code (Open/Closed Principle).

## Providers

| Provider    | Status         | API key env var     |
| ----------- | -------------- | ------------------- |
| `openai`    | Released       | `OPENAI_API_KEY`    |
| `deepl`     | Planned (flag) | `DEEPL_API_KEY`     |
| `anthropic` | Planned (flag) | `ANTHROPIC_API_KEY` |
| `gemini`    | Planned (flag) | `GEMINI_API_KEY`    |

Unreleased providers are gated behind `LANGSYNC_AI_EXPERIMENTAL=1` and are not
shown in the CLI until they ship.

## Usage

```ts
import { createAdapter, fillEmptyTranslations } from '@langsync/ai-engine';

const adapter = createAdapter({ provider: 'openai', model: 'gpt-4o-mini' });

const { tree, translatedKeys } = await fillEmptyTranslations({
  reference: { greet: 'Hello' },
  target: { greet: '' },
  sourceLocale: 'en',
  targetLocale: 'de',
  adapter,
});
```

`fillEmptyTranslations` only fills keys that are empty/missing in the target and
non-empty in the reference. Existing target translations are preserved.
