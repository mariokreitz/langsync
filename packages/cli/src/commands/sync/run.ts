import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles, writeJson } from '@langsync/shared/fs';
import { syncTrees } from '@langsync/core';

export interface RunSyncOptions {
  cwd: string;
  dryRun?: boolean;
}

export interface RunSyncResult {
  referenceLocale: string;
  written: string[];
  planned: string[];
}

/**
 * Synchronize keys from the reference locale into every other locale,
 * preserving existing translations and adding empty placeholders for new keys.
 */
export async function runSync(options: RunSyncOptions): Promise<RunSyncResult> {
  const loaded = await loadConfig(options.cwd);
  if (!loaded) {
    throw new Error('No LangSync config found. Run `langsync init` first.');
  }
  const { config } = loaded;
  const referenceLocale = config.defaultLocale ?? config.locales[0]!;

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
  const planned: string[] = [];
  const written: string[] = [];

  for (const target of targets) {
    const merged = syncTrees(reference.translations, target.translations);
    planned.push(target.path);
    if (!options.dryRun) {
      await writeJson(target.path, merged);
      written.push(target.path);
    }
  }

  return { referenceLocale, written, planned };
}

