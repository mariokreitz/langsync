import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles, writeJson } from '@langsync/shared/fs';
import { flatten } from '@langsync/core';
import { createAdapter, fillEmptyTranslations, type AIProvider } from '@langsync/ai-engine';
import { type LocaleFile } from '@langsync/shared/types';

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
   * iterating target locales in config order, then keys in reference order.
   * Remaining untranslated keys are reported in `skippedKeys`.
   */
  maxKeys?: number;
}

export interface RunTranslateResult {
  provider: AIProvider;
  referenceLocale: string;
  /** Files written to disk. */
  written: string[];
  /** Files that have at least one translated key (the change candidates). */
  planned: string[];
  /** Translated dot-notated keys per locale. */
  translatedByLocale: Record<string, string[]>;
  /**
   * Keys that were skipped due to the `--max-keys` cap, grouped by locale.
   * Empty when no cap was set or the cap was not reached.
   */
  skippedByLocale: Record<string, string[]>;
  /**
   * Total number of keys that could be translated (empty in target,
   * non-empty in reference) before any cap is applied.
   */
  totalTranslatableKeys: number;
}

/** A translation candidate: one locale × one key to translate. */
interface TranslateCandidate {
  file: LocaleFile;
  key: string;
  sourceValue: string;
}

/**
 * Fill empty values in every non-reference locale using the configured AI
 * provider, preserving existing translations.
 *
 * The candidate list is built before any API call so `--max-keys` is applied
 * deterministically, without bias from iteration timing.
 */
export async function runTranslate(options: RunTranslateOptions): Promise<RunTranslateResult> {
  const loaded = await loadConfig(options.cwd);
  if (!loaded) {
    throw new Error('No LangSync config found. Run `langsync init` first.');
  }
  const { config } = loaded;
  if (config.namespaces) {
    throw new Error(
      'Namespace support for this command is coming in a follow-up release. ' +
        'Remove the `namespaces` block from your config to use single-file mode.',
    );
  }

  const referenceLocale = config.defaultLocale ?? config.locales[0]!;

  const provider = options.provider ?? config.ai?.provider ?? 'openai';
  const adapter = createAdapter({
    provider,
    apiKey: config.ai?.apiKey,
    model: options.model ?? config.ai?.model,
  });

  const files = await loadLocaleFiles({
    cwd: options.cwd,
    inputDir: config.input,
    locales: config.locales,
    namespaces: config.namespaces,
  });

  const reference = files.find((f) => f.locale === referenceLocale);
  if (!reference) {
    throw new Error(`Could not find reference locale file for "${referenceLocale}".`);
  }

  const targets = files.filter((f) => f.locale !== referenceLocale);

  // Build the full candidate list before any API calls so we can:
  // 1. Report an accurate count for --dry-run
  // 2. Apply --max-keys deterministically (no mid-stream surprises)
  const refFlat = flatten(reference.translations);
  const allCandidates: TranslateCandidate[] = [];
  for (const target of targets) {
    const targetFlat = flatten(target.translations);
    for (const [key, value] of Object.entries(refFlat)) {
      if (!value || value.trim() === '') continue;
      if (targetFlat[key] && targetFlat[key].trim() !== '') continue;
      allCandidates.push({ file: target, key, sourceValue: value });
    }
  }

  const totalTranslatableKeys = allCandidates.length;
  const limited = options.maxKeys ? allCandidates.slice(0, options.maxKeys) : allCandidates;

  // Compute per-locale max-key budgets from the capped list
  const perLocaleMaxKeys: Record<string, number> = {};
  for (const candidate of limited) {
    perLocaleMaxKeys[candidate.file.locale] = (perLocaleMaxKeys[candidate.file.locale] ?? 0) + 1;
  }

  const written: string[] = [];
  const planned: string[] = [];
  const translatedByLocale: Record<string, string[]> = {};
  const skippedByLocale: Record<string, string[]> = {};

  for (const target of targets) {
    const localeMax = perLocaleMaxKeys[target.locale];
    // If this locale has no candidates in the limited list, skip entirely
    if (options.maxKeys !== undefined && !localeMax) {
      skippedByLocale[target.locale] = allCandidates
        .filter((c) => c.file.locale === target.locale)
        .map((c) => c.key);
      continue;
    }

    const { tree, translatedKeys, skippedKeys } = await fillEmptyTranslations({
      reference: reference.translations,
      target: target.translations,
      sourceLocale: referenceLocale,
      targetLocale: target.locale,
      adapter,
      maxKeys: localeMax,
    });

    translatedByLocale[target.locale] = translatedKeys;
    if (skippedKeys.length > 0) skippedByLocale[target.locale] = skippedKeys;

    if (translatedKeys.length === 0) continue;

    planned.push(target.path);
    if (!options.dryRun) {
      await writeJson(target.path, tree);
      written.push(target.path);
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
