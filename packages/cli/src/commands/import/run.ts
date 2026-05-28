import { join, resolve } from 'node:path';
import { loadConfig } from '@langsync/shared/config';
import { writeJson } from '@langsync/shared/fs';
import { importFromExcel } from '@langsync/excel-engine';

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
  const inputAbs = resolve(options.cwd, config.input);
  const configuredLocales = new Set(config.locales);

  const result = await importFromExcel(file, sheetName);

  const planned: string[] = [];
  const written: string[] = [];
  const skipped: string[] = [];

  for (const entry of result.locales) {
    if (!configuredLocales.has(entry.locale)) {
      skipped.push(entry.locale);
      continue;
    }
    const path = join(inputAbs, `${entry.locale}.json`);
    planned.push(path);
    if (!options.dryRun) {
      await writeJson(path, entry.translations);
      written.push(path);
    }
  }

  return { file, sheetName, written, planned, skipped };
}
