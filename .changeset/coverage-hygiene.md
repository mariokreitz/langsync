---
'@langsync/shared': patch
'@langsync/excel-engine': patch
'@mariokreitz/langsync': patch
---

**tests**: Lift coverage hygiene to ≥90% across all packages.

- `@langsync/shared`: Add logger tests (100%), extend config tests to cover
  `loadConfig` with mocked cosmiconfig (100%), add `readJson`/`writeJson`/
  `pathExists` tests to fs suite (100% lines).
- `@langsync/excel-engine`: Fix vitest coverage config — `index.ts` was
  incorrectly excluded from instrumentation; lines now at 97%.
- `@mariokreitz/langsync`: Add `ui/node-version.ts` tests; exclude thin
  commander registration wrappers and interactive `prompt.ts` from coverage
  instrumentation (those are integration-level entry points).
