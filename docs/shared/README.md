# Shared README fragments

These files are the **single source of truth** for the snippets embedded into
both `README.md` (the GitHub/repository README) and `packages/cli/README.md`
(the npm package README).

They are kept in sync automatically with [`embedme`](https://github.com/zakhenry/embedme),
which is wired into `pnpm format` (writes) and `pnpm format:check` /
`pnpm embed:verify` (CI verification — stale embeds fail the build).

## How it works

In either README, a fenced code block whose first line is a comment pointing at
a fragment path is owned by `embedme`:

````md
```bash
# docs/shared/install.sh
```
````

Running `pnpm format` fills the block with the fragment's contents. **Never edit
the embedded block by hand** — edit the fragment here and run `pnpm format`.

## Fragments

| File         | Embedded snippet                     |
| ------------ | ------------------------------------ |
| `install.sh` | Install command (pnpm / npm / yarn). |
| `config.ts`  | `langsync.config.ts` example.        |

What stays README-specific (not embedded):

- **Root `README.md`** — repository concerns: monorepo structure, contributing,
  roadmap, badges.
- **`packages/cli/README.md`** — npm concerns: quick start, command table,
  package links.
