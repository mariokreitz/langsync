---
'@langsync/shared': patch
---

Add namespace-aware locale file loader and config schema (foundation for namespace support). Adds optional `namespaces` block, `LocaleFile.namespace`, and `resolveLocaleFilePath`/`indexLocaleFiles` fs helpers.
