---
'@langsync/excel-engine': minor
'@mariokreitz/langsync': patch
---

excel-engine: namespace-aware export/import. Export emits a `namespace` column when any file has a namespace; import returns a `{ format, locales }` discriminator and reconstructs per-namespace trees. Single-file workbooks remain fully supported. NOTE: the excel-engine TypeScript contract changed (`ExportOptions.locales` → `files`; `ImportResult` adds `format` and `namespace`).
