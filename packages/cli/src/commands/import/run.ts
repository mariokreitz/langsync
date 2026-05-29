import { resolve } from 'node:path';
import { importFromExcel } from '@langsync/excel-engine';
import { loadConfig } from '@langsync/shared/config';
import { resolveLocaleFilePath, writeJson } from '@langsync/shared/fs';

export interface RunImportExcelOptions {
  cwd: string;
  file?: string;
  sheetName?: string;
  dryRun?: boolean;
}

export interface RunImportExcelResult {
  file: string;
  sheetName: string;
  written: string[];
  planned: string[];
  skipped: string[];
}

const DEFAULT_FILE = 'translations.xlsx';
const DEFAULT_SHEET = 'Translations';

/**
 * Import locales from an Excel workbook and write them back to the configured
 * input directory as JSON files. Locales not listed in the config are skipped.
 */
export async function runImportExcel(
  options: RunImportExcelOptions,
): Promise<RunImportExcelResult> {
  const loaded = await loadConfig(options.cwd);
  if (!loaded) {
    throw new Error('No LangSync config found. Run `langsync init` first.');
  }
  const { config } = loaded;

  const file = resolve(options.cwd, options.file ?? config.excel?.file ?? DEFAULT_FILE);
  const sheetName = options.sheetName ?? config.excel?.sheetName ?? DEFAULT_SHEET;
  const configuredLocales = new Set(config.locales);

  const result = await importFromExcel(file, sheetName);
  if (!config.namespaces && result.format === 'namespaced') {
    throw new Error(
      'Cannot import a namespaced workbook into a single-file project. Configure a `namespaces` block first.',
    );
  }
  if (config.namespaces && result.format === 'single-file') {
    throw new Error(
      'Cannot import a single-file workbook into a namespaced project. Export a namespaced workbook or remove the `namespaces` block.',
    );
  }

  const planned: string[] = [];
  const written: string[] = [];
  const skipped: string[] = [];

  for (const entry of result.locales) {
    if (!configuredLocales.has(entry.locale)) {
      skipped.push(entry.locale);
      continue;
    }
    const path = resolveLocaleFilePath({
      cwd: options.cwd,
      inputDir: config.input,
      locale: entry.locale,
      namespace: entry.namespace,
      namespaces: config.namespaces,
    });
    planned.push(path);
    if (!options.dryRun) {
      await writeJson(path, entry.translations);
      written.push(path);
    }
  }

  return { file, sheetName, written, planned, skipped };
}
