import { loadConfig } from '@langsync/shared/config';
import { indexLocaleFiles, loadLocaleFiles, writeJson } from '@langsync/shared/fs';
import { syncTrees, diffTrees, hasChanges, type TreeDiff } from '@langsync/core';
import { noNamespacesError } from '../shared/namespace-error.js';

export interface RunSyncOptions {
  cwd: string;
  dryRun?: boolean;
}

export interface RunSyncResult {
  referenceLocale: string;
  /** Paths that were written to disk. Empty in dry-run. */
  written: string[];
  /** Paths that were planned to be written (subset of targets with changes). */
  planned: string[];
  /** Paths skipped because the locale was already in sync with the reference. */
  unchanged: string[];
  /**
   * Per-path diff keyed by absolute file path.
   * Only contains entries for files that had changes (i.e. entries in `planned`).
   */
  diffsByPath: Record<string, TreeDiff>;
}

/**
 * Synchronize keys from the reference locale into every other locale,
 * preserving existing translations and adding empty placeholders for new keys.
 * Files whose content would not change after sync are skipped — no unnecessary
 * disk writes are performed.
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

  const planned: string[] = [];
  const written: string[] = [];
  const unchanged: string[] = [];
  const diffsByPath: Record<string, TreeDiff> = {};

  for (const targetLocale of config.locales) {
    if (targetLocale === referenceLocale) continue;
    const targetBucket = index.byLocale[targetLocale];
    if (!targetBucket) continue;

    for (const nsKey of nsKeys) {
      const source = referenceBucket.get(nsKey);
      const target = targetBucket.get(nsKey);
      if (!source || !target) continue;

      const merged = syncTrees(source.translations, target.translations);
      const diff = diffTrees(target.translations, merged);

      if (!hasChanges(diff)) {
        unchanged.push(target.path);
        continue;
      }

      diffsByPath[target.path] = diff;
      planned.push(target.path);
      if (!options.dryRun) {
        await writeJson(target.path, merged);
        written.push(target.path);
      }
    }
  }

  return { referenceLocale, written, planned, unchanged, diffsByPath };
}
