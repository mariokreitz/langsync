---
'@mariokreitz/langsync': minor
---

**sync**: Skip writing locale files that are already in sync with the reference.
`runSync` now uses `diffTrees`/`hasChanges` before each write. Files with no
changes are added to `unchanged` in the result and skipped entirely — no
unnecessary disk I/O.

**watch**: The watch summary now shows per-file change counts
(`+2 keys, -1, ~3 changed`) and distinguishes between synced files and files
that were already up to date.

`RunSyncResult` gains two new fields:

- `unchanged: string[]` — paths that were skipped (already in sync)
- `diffsByPath: Record<string, TreeDiff>` — diff details for changed files,
  keyed by absolute file path

`RunWatchPassResult` gains the same two fields, forwarded from `runSync`.
