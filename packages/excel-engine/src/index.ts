import ExcelJS from 'exceljs';
import { flatten, unflatten } from '@langsync/core';
import { type Locale, type TranslationTree } from '@langsync/shared/types';

export interface NamespacedFile {
  locale: Locale;
  namespace: string | null;
  translations: TranslationTree;
}

export interface ExportOptions {
  file: string;
  sheetName?: string;
  files: NamespacedFile[];
}

export type WorkbookFormat = 'single-file' | 'namespaced';

export interface ImportResult {
  format: WorkbookFormat;
  locales: NamespacedFile[];
}

function distinctLocales(files: NamespacedFile[]): Locale[] {
  const seen = new Set<Locale>();
  const locales: Locale[] = [];
  for (const file of files) {
    if (seen.has(file.locale)) continue;
    seen.add(file.locale);
    locales.push(file.locale);
  }
  return locales;
}

function cellText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function addHeader(sheet: ExcelJS.Worksheet, header: string[]): void {
  sheet.addRow(header);
  sheet.getRow(1).font = { bold: true };
}

function exportSingleFile(sheet: ExcelJS.Worksheet, files: NamespacedFile[]): void {
  const locales = distinctLocales(files);
  addHeader(sheet, ['key', ...locales]);

  const flatByLocale = new Map<Locale, Record<string, string>>();
  for (const file of files) {
    flatByLocale.set(file.locale, flatten(file.translations));
  }

  const allKeys = new Set<string>();
  for (const flat of flatByLocale.values()) {
    for (const key of Object.keys(flat)) allKeys.add(key);
  }

  for (const key of [...allKeys].sort()) {
    sheet.addRow([key, ...locales.map((locale) => flatByLocale.get(locale)?.[key] ?? '')]);
  }
}

function namespacedKey(namespace: string, locale: Locale): string {
  return `${namespace}\u0000${locale}`;
}

function exportNamespaced(sheet: ExcelJS.Worksheet, files: NamespacedFile[]): void {
  const locales = distinctLocales(files);
  addHeader(sheet, ['namespace', 'key', ...locales]);

  const flatByNamespaceLocale = new Map<string, Record<string, string>>();
  const rowKeys = new Set<string>();

  for (const file of files) {
    if (file.namespace === null) continue;
    const flat = flatten(file.translations);
    flatByNamespaceLocale.set(namespacedKey(file.namespace, file.locale), flat);
    for (const key of Object.keys(flat)) rowKeys.add(`${file.namespace}\u0000${key}`);
  }

  const sortedRows = [...rowKeys]
    .map((rowKey) => {
      const [namespace, key] = rowKey.split('\u0000') as [string, string];
      return { namespace, key };
    })
    .sort((a, b) => a.namespace.localeCompare(b.namespace) || a.key.localeCompare(b.key));

  for (const { namespace, key } of sortedRows) {
    sheet.addRow([
      namespace,
      key,
      ...locales.map(
        (locale) => flatByNamespaceLocale.get(namespacedKey(namespace, locale))?.[key] ?? '',
      ),
    ]);
  }
}

/**
 * Export translations to an Excel workbook.
 */
export async function exportToExcel(options: ExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? 'Translations');

  const allSingleFile = options.files.every((file) => file.namespace === null);
  const allNamespaced = options.files.every((file) => file.namespace !== null);
  if (!allSingleFile && !allNamespaced) {
    throw new Error('exportToExcel: files must be uniformly single-file or namespaced.');
  }

  if (allSingleFile) {
    exportSingleFile(sheet, options.files);
  } else {
    exportNamespaced(sheet, options.files);
  }

  await workbook.xlsx.writeFile(options.file);
}

function importSingleFile(sheet: ExcelJS.Worksheet, header: (string | undefined)[]): ImportResult {
  const locales = header.slice(2).filter((value): value is string => typeof value === 'string');
  const flatPerLocale: Record<string, Record<string, string>> = Object.fromEntries(
    locales.map((locale) => [locale, {}]),
  );

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values as unknown[];
    const key = cellText(values[1]);
    if (!key) return;
    locales.forEach((locale, idx) => {
      flatPerLocale[locale]![key] = cellText(values[idx + 2]);
    });
  });

  return {
    format: 'single-file',
    locales: locales.map((locale) => ({
      locale,
      namespace: null,
      translations: unflatten(flatPerLocale[locale]!),
    })),
  };
}

function importNamespaced(sheet: ExcelJS.Worksheet, header: (string | undefined)[]): ImportResult {
  const locales = header.slice(3).filter((value): value is string => typeof value === 'string');
  const namespaces = new Set<string>();
  const flatByLocaleNamespace = new Map<string, Record<string, string>>();
  const seenRows = new Set<string>();

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values as unknown[];
    const namespace = cellText(values[1]).trim();
    const key = cellText(values[2]);
    if (!key) return;
    if (!namespace) {
      throw new Error(
        `Row ${rowNumber}: namespace cell must not be empty in a namespaced workbook.`,
      );
    }

    const rowKey = `${namespace}\u0000${key}`;
    if (seenRows.has(rowKey)) {
      throw new Error(`Duplicate (namespace, key) row: "${namespace}" / "${key}".`);
    }
    seenRows.add(rowKey);
    namespaces.add(namespace);

    locales.forEach((locale, idx) => {
      const mapKey = namespacedKey(namespace, locale);
      let flat = flatByLocaleNamespace.get(mapKey);
      if (!flat) {
        flat = {};
        flatByLocaleNamespace.set(mapKey, flat);
      }
      flat[key] = cellText(values[idx + 3]);
    });
  });

  return {
    format: 'namespaced',
    locales: locales.flatMap((locale) =>
      [...namespaces].map((namespace) => ({
        locale,
        namespace,
        translations: unflatten(flatByLocaleNamespace.get(namespacedKey(namespace, locale)) ?? {}),
      })),
    ),
  };
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
  if (header[1] === 'key') return importSingleFile(sheet, header);
  if (header[1] === 'namespace' && header[2] === 'key') return importNamespaced(sheet, header);

  throw new Error(
    'Unrecognized workbook header. Expected "key" (single-file) or "namespace","key" (namespaced).',
  );
}
