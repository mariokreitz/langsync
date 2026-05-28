import { type TranslationTree } from '@langsync/shared/types';

/**
 * Flatten a nested translation tree into dot-notated keys.
 * @example { a: { b: 'x' } } -> { 'a.b': 'x' }
 */
export function flatten(tree: TranslationTree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out[fullKey] = value;
    } else {
      Object.assign(out, flatten(value, fullKey));
    }
  }
  return out;
}

/**
 * Expand a flat dot-notated record back into a nested tree.
 */
export function unflatten(flat: Record<string, string>): TranslationTree {
  const result: TranslationTree = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let cursor: TranslationTree = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      const next = cursor[part];
      if (typeof next !== 'object' || next === null) {
        const fresh: TranslationTree = {};
        cursor[part] = fresh;
        cursor = fresh;
      } else {
        cursor = next;
      }
    }
    cursor[parts[parts.length - 1]!] = value;
  }
  return result;
}
