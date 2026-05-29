import { type TranslationTree } from '@langsync/shared/types';
import { flatten } from '../parsers/index.js';

export interface TreeDiff {
  /** Keys present in `next` but not in `prev`. */
  added: string[];
  /** Keys present in `prev` but not in `next`. */
  removed: string[];
  /** Keys present in both whose value changed. */
  changed: string[];
}

/**
 * Compute a flat-key diff between two translation trees.
 *
 * Used by watch mode to decide whether an incremental sync is needed and to
 * print a compact change summary without rewriting unchanged files.
 */
export function diffTrees(prev: TranslationTree, next: TranslationTree): TreeDiff {
  const prevFlat = flatten(prev);
  const nextFlat = flatten(next);
  const prevKeys = new Set(Object.keys(prevFlat));
  const nextKeys = new Set(Object.keys(nextFlat));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const key of nextKeys) {
    if (!prevKeys.has(key)) added.push(key);
    else if (prevFlat[key] !== nextFlat[key]) changed.push(key);
  }
  for (const key of prevKeys) {
    if (!nextKeys.has(key)) removed.push(key);
  }

  return { added, removed, changed };
}

/** True when a diff contains any added, removed, or changed keys. */
export function hasChanges(diff: TreeDiff): boolean {
  return diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0;
}
