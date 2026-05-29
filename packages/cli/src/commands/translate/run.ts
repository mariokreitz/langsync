import { createAdapter, fillEmptyTranslations, type AIProvider } from '@langsync/ai-engine';
import { flatten } from '@langsync/core';
import { loadConfig } from '@langsync/shared/config';
import { indexLocaleFiles, loadLocaleFiles, writeJson } from '@langsync/shared/fs';
import { noNamespacesError } from '../shared/namespace-error.js';

export interface RunTranslateOptions {
  cwd: string;
  dryRun?: boolean;
  /** Override the provider configured in `langsync.config.ts`. */
  provider?: AIProvider;
  /** Override the model configured in `langsync.config.ts`. */
  model?: string;
  /**
   * Maximum total number of keys to translate across all target locales.
   * Keys are selected deterministically (same order on every run) by
   * iterating target locales in config order, then namespaces in order, then
   * keys in reference order. Remaining untranslated keys are reported.
   */
  maxKeys?: number;
}

export interface TranslationEntry {
  namespace: string | null;
  key: string;
  path: string;
}

export interface RunTranslateResult {
  provider: AIProvider;
  referenceLocale: string;
  /** Files written to disk. */
  written: string[];
  /** Files that have at least one translated key (the change candidates). */
  planned: string[];
  /** Translated dot-notated keys per locale. */
  translatedByLocale: Record<string, TranslationEntry[]>;
  /** Keys that were skipped due to the `--max-keys` cap, grouped by locale. */
  skippedByLocale: Record<string, TranslationEntry[]>;
  /** Total number of keys that could be translated before any cap is applied. */
  totalTranslatableKeys: number;
}

interface TranslateCandidate extends TranslationEntry {
  locale: string;
  sourceValue: string;
}

function isEmpty(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

function candidateEntry(candidate: TranslateCandidate): TranslationEntry {
  return { namespace: candidate.namespace, key: candidate.key, path: candidate.path };
}

/**
 * Fill empty values in every non-reference locale using the configured AI
 * provider, preserving existing translations.
 */
export async function runTranslate(options: RunTranslateOptions): Promise<RunTranslateResult> {
  const loaded = await loadConfig(options.cwd);
  if (!loaded) {
    throw new Error('No LangSync config found. Run `langsync init` first.');
  }
  const { config } = loaded;
  const referenceLocale = config.defaultLocale ?? config.locales[0]!;

  const provider = options.provider ?? config.ai?.provider ?? 'openai';

  const files = await loadLocaleFiles({
    cwd: options.cwd,
    inputDir: config.input,
    locales: config.locales,
    namespaces: config.namespaces,
  });
  const index = indexLocaleFiles(files);
  const namespaced = config.namespaces !== undefined;
  if (namespaced && index.namespaces.length === 0) {
    throw noNamespacesError(referenceLocale, config.input);
  }
  const nsKeys: (string | null)[] = namespaced ? index.namespaces : [null];

  const referenceBucket = index.byLocale[referenceLocale];
  if (!referenceBucket) {
    throw new Error(`Could not find reference locale file for "${referenceLocale}".`);
  }

  const adapter = createAdapter({
    provider,
    apiKey: config.ai?.apiKey,
    model: options.model ?? config.ai?.model,
  });

  const allCandidates: TranslateCandidate[] = [];
  for (const targetLocale of config.locales) {
    if (targetLocale === referenceLocale) continue;
    const targetBucket = index.byLocale[targetLocale];
    if (!targetBucket) continue;

    for (const nsKey of nsKeys) {
      const reference = referenceBucket.get(nsKey);
      const target = targetBucket.get(nsKey);
      if (!reference || !target) continue;

      const refFlat = flatten(reference.translations);
      const targetFlat = flatten(target.translations);
      for (const [key, value] of Object.entries(refFlat)) {
        if (isEmpty(value)) continue;
        if (!isEmpty(targetFlat[key])) continue;
        allCandidates.push({
          locale: targetLocale,
          namespace: nsKey,
          path: target.path,
          key,
          sourceValue: value,
        });
      }
    }
  }

  const totalTranslatableKeys = allCandidates.length;
  const limited = options.maxKeys ? allCandidates.slice(0, options.maxKeys) : allCandidates;
  const limitedByPath = new Map<string, TranslateCandidate[]>();
  const skippedCandidates = options.maxKeys ? allCandidates.slice(options.maxKeys) : [];

  for (const candidate of limited) {
    const entries = limitedByPath.get(candidate.path) ?? [];
    entries.push(candidate);
    limitedByPath.set(candidate.path, entries);
  }

  const written: string[] = [];
  const planned: string[] = [];
  const translatedByLocale: Record<string, TranslationEntry[]> = {};
  const skippedByLocale: Record<string, TranslationEntry[]> = {};

  for (const candidate of skippedCandidates) {
    if (limitedByPath.has(candidate.path)) continue;
    (skippedByLocale[candidate.locale] ??= []).push(candidateEntry(candidate));
  }

  for (const targetLocale of config.locales) {
    if (targetLocale === referenceLocale) continue;
    const targetBucket = index.byLocale[targetLocale];
    if (!targetBucket) continue;

    for (const nsKey of nsKeys) {
      const reference = referenceBucket.get(nsKey);
      const target = targetBucket.get(nsKey);
      if (!reference || !target) continue;

      const budget = limitedByPath.get(target.path)?.length;
      if (budget === undefined) continue;

      const { tree, translatedKeys, skippedKeys } = await fillEmptyTranslations({
        reference: reference.translations,
        target: target.translations,
        sourceLocale: referenceLocale,
        targetLocale,
        adapter,
        maxKeys: budget,
      });

      if (translatedKeys.length > 0) {
        (translatedByLocale[targetLocale] ??= []).push(
          ...translatedKeys.map((key) => ({ namespace: nsKey, key, path: target.path })),
        );
        planned.push(target.path);
        if (!options.dryRun) {
          await writeJson(target.path, tree);
          written.push(target.path);
        }
      }

      if (skippedKeys.length > 0) {
        (skippedByLocale[targetLocale] ??= []).push(
          ...skippedKeys.map((key) => ({ namespace: nsKey, key, path: target.path })),
        );
      }
    }
  }

  return {
    provider,
    referenceLocale,
    written,
    planned,
    translatedByLocale,
    skippedByLocale,
    totalTranslatableKeys,
  };
}
