---
'langsync': minor
---

Initial public preview release.

Introduces the `langsync` CLI scaffold with the following commands as stubs:

- `langsync init` — scaffold a `langsync.config.ts` (full implementation pending)
- `langsync sync` — cross-locale sync engine
- `langsync validate` — locale consistency validation
- `langsync find-missing` — missing-keys reporter
- `langsync export excel` — export translations to Excel
- `langsync import excel` — import translations from Excel

This release establishes the public package surface (`langsync` on npm) and the
programmatic API entrypoint (`defineConfig`). Subsequent minor releases will
ship real implementations of each command.
