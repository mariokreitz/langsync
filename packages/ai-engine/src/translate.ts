import { flatten, unflatten } from '@langsync/core';
import { type TranslationTree } from '@langsync/shared/types';
import { type TranslationAdapter } from './types.js';

export interface FillTranslationsOptions {
  /** Reference-locale tree (the source of truth for values). */
  reference: TranslationTree;
  /** Target-locale tree to fill (existing translations are preserved). */
  target: TranslationTree;
  sourceLocale: string;
  targetLocale: string;
  adapter: TranslationAdapter;
  /**
   * Maximum number of keys to translate. When set, only the first `maxKeys`
   * empty keys (in stable iteration order) are translated. Remaining empty
   * keys are left untouched. Pass `undefined` or omit to translate all.
   *
   * Prefer computing the cap at the call site using a deterministic candidate
   * list built before dispatching API calls (see `runTranslate`).
   */
  maxKeys?: number;
}

export interface FillTranslationsResult {
  /** The target tree with previously-empty values filled where possible. */
  tree: TranslationTree;
  /** Dot-notated keys that were translated and filled. */
  translatedKeys: string[];
  /**
   * Dot-notated keys that were empty in the target but skipped due to the
   * `maxKeys` cap. These are the keys that would have been translated next.
   */
  skippedKeys: string[];
}

function isEmpty(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

/**
 * Fill empty target values using the reference value translated by `adapter`.
 *
 * Only keys that exist with a non-empty reference value AND are empty/missing
 * in the target are translated. Existing target translations are never
 * overwritten (target wins), mirroring `syncTrees` semantics.
 *
 * When `maxKeys` is set, translation stops after that many keys; remaining
 * empty keys are returned in `skippedKeys`.
 */
export async function fillEmptyTranslations(
  options: FillTranslationsOptions,
): Promise<FillTranslationsResult> {
  const referenceFlat = flatten(options.reference);
  const targetFlat = flatten(options.target);
  const translatedKeys: string[] = [];
  const skippedKeys: string[] = [];

  for (const [key, referenceValue] of Object.entries(referenceFlat)) {
    if (isEmpty(referenceValue)) continue;
    if (!isEmpty(targetFlat[key])) continue;

    if (options.maxKeys !== undefined && translatedKeys.length >= options.maxKeys) {
      skippedKeys.push(key);
      continue;
    }

    targetFlat[key] = await options.adapter.translate({
      text: referenceValue,
      sourceLocale: options.sourceLocale,
      targetLocale: options.targetLocale,
    });
    translatedKeys.push(key);
  }

  return { tree: unflatten(targetFlat), translatedKeys, skippedKeys };
}
