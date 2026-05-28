import { type TranslationTree } from '@langsync/shared/types';
import { flatten, unflatten } from '../parsers/index.js';

/**
 * Merge `source` into `target`, preserving existing target values.
 * Missing keys from source are added with empty strings as placeholders.
 */
export function syncTrees(source: TranslationTree, target: TranslationTree): TranslationTree {
  const sourceFlat = flatten(source);
  const targetFlat = flatten(target);

  const merged: Record<string, string> = {};
  for (const key of Object.keys(sourceFlat)) {
    merged[key] = targetFlat[key] ?? '';
  }
  return unflatten(merged);
}
