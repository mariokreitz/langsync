---
'@mariokreitz/langsync': minor
---

Add V2 features: `langsync translate` (AI-assisted translation with a pluggable
provider adapter — OpenAI released; DeepL, Anthropic, and Gemini behind a flag)
and `langsync watch` (incremental sync + validation on file change). Adds `ai`
configuration options and a composite GitHub Action for `validate` in CI.
