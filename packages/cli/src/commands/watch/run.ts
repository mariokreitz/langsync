import { resolve } from 'node:path';
import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles } from '@langsync/shared/fs';
import { validateLocales, type ValidationIssue } from '@langsync/core';
import { runSync } from '../sync/run.js';

export interface RunWatchPassOptions {
  cwd: string;
  dryRun?: boolean;
}

export interface RunWatchPassResult {
  referenceLocale: string;
  written: string[];
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
  return resolve(cwd, loaded.config.input);
}

/**
 * Run a single watch pass: incremental sync followed by validation.
 * Returned to the watch command so it can render a compact summary.
 */
export async function runWatchPass(options: RunWatchPassOptions): Promise<RunWatchPassResult> {
  const { referenceLocale, written } = await runSync({
    cwd: options.cwd,
    dryRun: options.dryRun,
  });

  const loaded = await loadConfig(options.cwd);
  if (!loaded) {
    throw new Error('No LangSync config found. Run `langsync init` first.');
  }

  const files = await loadLocaleFiles({
    cwd: options.cwd,
    inputDir: loaded.config.input,
    locales: loaded.config.locales,
  });

  const issues = validateLocales(files, referenceLocale);
  return { referenceLocale, written, issues };
}
