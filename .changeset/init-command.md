---
'langsync': patch
---

**feat(cli): implement `langsync init` interactive setup**

The `init` command is now fully functional. It:

- Auto-detects the project's i18n framework (`i18next`, `ngx-translate`, `react-intl`) by inspecting `package.json` dependencies.
- Runs an interactive prompt flow for input/output directories, locales, default locale, and framework confirmation.
- Writes a typed `langsync.config.ts` (or `langsync.config.json` with `--json`) using `defineConfig`.
- Scaffolds empty `<locale>.json` stubs in the input directory (preserves existing files).
- Refuses to overwrite an existing config unless `--force` is passed.
- Supports `--yes` for non-interactive scaffolding with sensible defaults.

Also adds runtime support for `langsync.config.ts` via `cosmiconfig-typescript-loader` in the config loader.
