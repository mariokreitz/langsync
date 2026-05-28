import ExcelJS from 'exceljs';
import { flatten, unflatten } from '@langsync/core';
import { type Locale, type TranslationTree } from '@langsync/shared/types';

export interface ExportOptions {
  file: string;
  sheetName?: string;
  locales: { locale: Locale; translations: TranslationTree }[];
}

export interface ImportResult {
  locales: { locale: Locale; translations: TranslationTree }[];
}

/**
 * Export translations to an Excel workbook.
 * Layout: column A = key, subsequent columns = locale values.
 */
export async function exportToExcel(options: ExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? 'Translations');

  const localeKeys = options.locales.map((l) => l.locale);
  sheet.addRow(['key', ...localeKeys]);

  const allKeys = new Set<string>();
  const flatPerLocale = options.locales.map((l) => flatten(l.translations));
  for (const flat of flatPerLocale) {
    for (const k of Object.keys(flat)) allKeys.add(k);
  }

  for (const key of [...allKeys].sort()) {
    sheet.addRow([key, ...flatPerLocale.map((flat) => flat[key] ?? '')]);
  }

  sheet.getRow(1).font = { bold: true };
  await workbook.xlsx.writeFile(options.file);
}

/**
 * Import translations from an Excel workbook.
 */
export async function importFromExcel(file: string, sheetName?: string): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
  if (!sheet) throw new Error(`Worksheet not found: ${sheetName ?? '<first>'}`);

  const header = sheet.getRow(1).values as (string | undefined)[];
  // ExcelJS uses 1-based arrays; index 0 is empty.
  const locales = header.slice(2).filter((v): v is string => typeof v === 'string');
  const flatPerLocale: Record<string, Record<string, string>> = Object.fromEntries(
    locales.map((l) => [l, {}]),
  );

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values as (string | undefined)[];
    const key = values[1];
    if (!key) return;
    locales.forEach((locale, idx) => {
      const value = values[idx + 2];
      flatPerLocale[locale]![key] = typeof value === 'string' ? value : '';
    });
  });

  return {
    locales: locales.map((locale) => ({
      locale,
      translations: unflatten(flatPerLocale[locale]!),
    })),
  };
}
