# @langsync/core

> Core engines for LangSync — parsers, validators, and the sync algorithm.

Internal package of the [LangSync](https://github.com/mariokreitz/langsync)
monorepo. Not published independently to npm; consumed by the `langsync` CLI
and other workspace packages.

## Public API

```ts
import {
  flatten,
  unflatten,
  validateLocales,
  syncTrees,
  type ValidationIssue,
} from '@langsync/core';
```

### `flatten(tree)`

Convert a nested translation tree into a flat record of dot-notated keys.

```ts
flatten({ greeting: { hello: 'Hi' } });
// => { 'greeting.hello': 'Hi' }
```

### `unflatten(flat)`

Inverse of `flatten`.

### `validateLocales(files, referenceLocale)`

Compare every locale against a reference and return issues of type
`missing`, `extra`, or `empty`.

### `syncTrees(source, target)`

Merge `source` keys into `target`. Existing target values win; missing keys
become empty strings; keys removed from `source` are dropped.

## Testing

```bash
pnpm --filter @langsync/core test
```

## License

MIT
