import { resolve } from 'node:path';
import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles } from '@langsync/shared/fs';
import { exportToExcel } from '@langsync/excel-engine';

export interface RunExportExcelOptions {
  cwd: string;
  /** Override the excel file path (relative to cwd). */
  file?: string;
  /** Override the worksheet name. */
  sheetName?: string;
}

export interface RunExportExcelResult {
  file: string;
  sheetName: string;
  locales: string[];
}

const DEFAULT_FILE = 'translations.xlsx';
const DEFAULT_SHEET = 'Translations';

/**
 * Export all configured locales into a single Excel workbook.
 */
export async function runExportExcel(
  options: RunExportExcelOptions,
): Promise<RunExportExcelResult> {
  const loaded = await loadConfig(options.cwd);
  if (!loaded) {
    throw new Error('No LangSync config found. Run `langsync init` first.');
  }
  const { config } = loaded;

  const file = resolve(options.cwd, options.file ?? config.excel?.file ?? DEFAULT_FILE);
  const sheetName = options.sheetName ?? config.excel?.sheetName ?? DEFAULT_SHEET;

  const files = await loadLocaleFiles({
    cwd: options.cwd,
    inputDir: config.input,
    locales: config.locales,
  });

  await exportToExcel({
    file,
    sheetName,
    locales: files.map((f) => ({ locale: f.locale, translations: f.translations })),
  });

  return { file, sheetName, locales: files.map((f) => f.locale) };
}
