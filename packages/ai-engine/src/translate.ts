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
}

export interface FillTranslationsResult {
  /** The target tree with previously-empty values filled where possible. */
  tree: TranslationTree;
  /** Dot-notated keys that were translated and filled. */
  translatedKeys: string[];
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
 */
export async function fillEmptyTranslations(
  options: FillTranslationsOptions,
): Promise<FillTranslationsResult> {
  const referenceFlat = flatten(options.reference);
  const targetFlat = flatten(options.target);
  const translatedKeys: string[] = [];

  for (const [key, referenceValue] of Object.entries(referenceFlat)) {
    if (isEmpty(referenceValue)) continue;
    if (!isEmpty(targetFlat[key])) continue;

    targetFlat[key] = await options.adapter.translate({
      text: referenceValue,
      sourceLocale: options.sourceLocale,
      targetLocale: options.targetLocale,
    });
    translatedKeys.push(key);
  }

  return { tree: unflatten(targetFlat), translatedKeys };
}
