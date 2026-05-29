import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles, writeJson } from '@langsync/shared/fs';
import { createAdapter, fillEmptyTranslations, type AIProvider } from '@langsync/ai-engine';

export interface RunTranslateOptions {
  cwd: string;
  dryRun?: boolean;
  /** Override the provider configured in `langsync.config.ts`. */
  provider?: AIProvider;
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
  const adapter = createAdapter({
    provider,
    apiKey: config.ai?.apiKey,
    model: config.ai?.model,
  });

  const files = await loadLocaleFiles({
    cwd: options.cwd,
    inputDir: config.input,
    locales: config.locales,
  });

  const reference = files.find((f) => f.locale === referenceLocale);
  if (!reference) {
    throw new Error(`Could not find reference locale file for "${referenceLocale}".`);
  }

  const targets = files.filter((f) => f.locale !== referenceLocale);
  const written: string[] = [];
  const planned: string[] = [];
  const translatedByLocale: Record<string, string[]> = {};

  for (const target of targets) {
    const { tree, translatedKeys } = await fillEmptyTranslations({
      reference: reference.translations,
      target: target.translations,
      sourceLocale: referenceLocale,
      targetLocale: target.locale,
      adapter,
    });

    translatedByLocale[target.locale] = translatedKeys;
    if (translatedKeys.length === 0) continue;

    planned.push(target.path);
    if (!options.dryRun) {
      await writeJson(target.path, tree);
      written.push(target.path);
    }
  }

  return { provider, referenceLocale, written, planned, translatedByLocale };
}
