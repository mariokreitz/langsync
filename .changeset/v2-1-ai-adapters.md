---
'@mariokreitz/langsync': minor
---

Add DeepL, Anthropic, and Gemini AI translation adapters. All three implement
the same `TranslationAdapter` interface and are fully tested, but remain gated
behind `LANGSYNC_AI_EXPERIMENTAL=1` until each graduates to released after
smoke-testing. DeepL auto-detects the free (`api-free.deepl.com`) vs. pro
(`api.deepl.com`) endpoint from the `:fx` key suffix, with a `useFreeTier`
override.
