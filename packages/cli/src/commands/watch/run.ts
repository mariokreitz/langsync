import { resolve } from 'node:path';
import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles } from '@langsync/shared/fs';
import { validateLocales, type ValidationIssue, type TreeDiff } from '@langsync/core';
import { runSync } from '../sync/run.js';

export interface RunWatchPassOptions {
  cwd: string;
  dryRun?: boolean;
}

export interface RunWatchPassResult {
  referenceLocale: string;
  written: string[];
  /** Paths skipped because they were already in sync with the reference. */
  unchanged: string[];
  /**
   * Per-path diff keyed by absolute file path.
   * Only contains entries for files that had changes.
   */
  diffsByPath: Record<string, TreeDiff>;
  issues: ValidationIssue[];
}

/**
 * Resolve the directory whose locale JSON files should be watched.
 * @throws if no config is found.
 */
export async function resolveWatchDir(cwd: string): Promise<string> {
  const loaded = await loadConfig(cwd);
  if (!loaded) {
    throw new Error('No LangSync config found. Run `langsync init` first.');
  }
  if (loaded.config.namespaces) {
    throw new Error(
      'Namespace support for this command is coming in a follow-up release. ' +
        'Remove the `namespaces` block from your config to use single-file mode.',
    );
  }

  return resolve(cwd, loaded.config.input);
}

/**
 * Run a single watch pass: incremental sync followed by validation.
 * Returned to the watch command so it can render a compact summary.
 */
export async function runWatchPass(options: RunWatchPassOptions): Promise<RunWatchPassResult> {
  const loaded = await loadConfig(options.cwd);
  if (!loaded) {
    throw new Error('No LangSync config found. Run `langsync init` first.');
  }
  if (loaded.config.namespaces) {
    throw new Error(
      'Namespace support for this command is coming in a follow-up release. ' +
        'Remove the `namespaces` block from your config to use single-file mode.',
    );
  }

  const { referenceLocale, written, unchanged, diffsByPath } = await runSync({
    cwd: options.cwd,
    dryRun: options.dryRun,
  });

  const files = await loadLocaleFiles({
    cwd: options.cwd,
    inputDir: loaded.config.input,
    locales: loaded.config.locales,
    namespaces: loaded.config.namespaces,
  });

  const issues = validateLocales(files, referenceLocale);
  return { referenceLocale, written, unchanged, diffsByPath, issues };
}
