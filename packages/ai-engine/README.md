# @langsync/ai-engine

> AI translation adapters for LangSync.

Provider-agnostic translation backends used by `langsync translate`. Each
provider implements a single `TranslationAdapter` interface, so new providers
are added without touching existing code (Open/Closed Principle).

## Providers

| Provider    | Status              | API key env var     | Notes                                          |
| ----------- | ------------------- | ------------------- | ---------------------------------------------- |
| `openai`    | Released            | `OPENAI_API_KEY`    | Default model `gpt-5-mini`.                    |
| `deepl`     | Experimental (flag) | `DEEPL_API_KEY`     | Free/pro endpoint auto-detected via `:fx` key. |
| `anthropic` | Experimental (flag) | `ANTHROPIC_API_KEY` | Default model `claude-haiku-4-5`.              |
| `gemini`    | Experimental (flag) | `GEMINI_API_KEY`    | Default model `gemini-3-flash`.                |

The experimental providers are implemented and tested, but stay gated behind
`LANGSYNC_AI_EXPERIMENTAL=1` and are not shown in the CLI until each graduates
to released after smoke-testing.

## Usage

```ts
import { createAdapter, fillEmptyTranslations } from '@langsync/ai-engine';

const adapter = createAdapter({ provider: 'openai', model: 'gpt-5-mini' });

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
