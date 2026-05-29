---
'@mariokreitz/langsync': minor
---

Add AI translate support to the GitHub Action and a `--model` flag to
`langsync translate`. The composite action gains `translate`, `ai-provider`,
`ai-api-key`, `ai-model`, and `ai-dry-run` inputs; the translate step maps the
key to the provider-specific env var and sets `LANGSYNC_AI_EXPERIMENTAL=1` so
experimental providers work in CI. Translate is off by default; prefer
`ai-dry-run: true` on pull-request checks to avoid unnecessary API costs.
