import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { exportToExcel, importFromExcel, type NamespacedFile } from './index.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(process.cwd(), '.vitest-excel-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function writeWorkbook(
  file: string,
  rows: unknown[][],
  sheetName = 'Translations',
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  rows.forEach((row) => sheet.addRow(row));
  await workbook.xlsx.writeFile(file);
}

describe('excel-engine single-file workbooks', () => {
  it('exports the legacy key/locales format and round-trips translations', async () => {
    const file = join(tmpDir, 'translations.xlsx');
    const files: NamespacedFile[] = [
      {
        locale: 'en',
        namespace: null,
        translations: { greeting: { hello: 'Hello', bye: 'Bye' }, app: { name: 'LangSync' } },
      },
      {
        locale: 'de',
        namespace: null,
        translations: { greeting: { hello: 'Hallo', bye: 'Tschuess' }, app: { name: 'LangSync' } },
      },
    ];

    await exportToExcel({ file, files });
    const result = await importFromExcel(file);

    const byLocale = Object.fromEntries(result.locales.map((entry) => [entry.locale, entry]));
    expect(result.format).toBe('single-file');
    expect(byLocale.en).toEqual({
      locale: 'en',
      namespace: null,
      translations: files[0]!.translations,
    });
    expect(byLocale.de).toEqual({
      locale: 'de',
      namespace: null,
      translations: files[1]!.translations,
    });
  });

  it('writes a header row ["key", "en", "de"]', async () => {
    const file = join(tmpDir, 'header.xlsx');
    await exportToExcel({
      file,
      files: [
        { locale: 'en', namespace: null, translations: { a: 'A' } },
        { locale: 'de', namespace: null, translations: { a: 'A' } },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    const sheet = workbook.worksheets[0]!;
    expect((sheet.getRow(1).values as (string | undefined)[]).slice(1)).toEqual([
      'key',
      'en',
      'de',
    ]);
  });

  it('sorts keys alphabetically in the exported workbook', async () => {
    const file = join(tmpDir, 'sorted.xlsx');
    await exportToExcel({
      file,
      files: [{ locale: 'en', namespace: null, translations: { zeta: 'Z', alpha: 'A', mid: 'M' } }],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    const sheet = workbook.worksheets[0]!;
    const keys: string[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      keys.push((row.values as (string | undefined)[])[1] ?? '');
    });
    expect(keys).toEqual(['alpha', 'mid', 'zeta']);
  });

  it('throws when the requested worksheet is missing', async () => {
    const file = join(tmpDir, 'nosheet.xlsx');
    await exportToExcel({
      file,
      sheetName: 'A',
      files: [{ locale: 'en', namespace: null, translations: { x: 'X' } }],
    });

    await expect(importFromExcel(file, 'DoesNotExist')).rejects.toThrow(/Worksheet not found/);
  });

  it('imports a legacy single-file workbook and reports single-file format', async () => {
    const file = join(tmpDir, 'legacy.xlsx');
    await writeWorkbook(file, [
      ['key', 'en', 'de'],
      ['app.name', 'LangSync', 'LangSync'],
      ['greeting.hello', 'Hello', 'Hallo'],
    ]);

    const result = await importFromExcel(file);

    expect(result).toEqual({
      format: 'single-file',
      locales: [
        {
          locale: 'en',
          namespace: null,
          translations: { app: { name: 'LangSync' }, greeting: { hello: 'Hello' } },
        },
        {
          locale: 'de',
          namespace: null,
          translations: { app: { name: 'LangSync' }, greeting: { hello: 'Hallo' } },
        },
      ],
    });
  });
});

describe('excel-engine namespaced workbooks', () => {
  it('writes a header row ["namespace", "key", ...locales]', async () => {
    const file = join(tmpDir, 'namespaced-header.xlsx');
    await exportToExcel({
      file,
      files: [
        { locale: 'en', namespace: 'common', translations: { a: 'A' } },
        { locale: 'de', namespace: 'common', translations: { a: 'A' } },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    const sheet = workbook.worksheets[0]!;
    expect((sheet.getRow(1).values as (string | undefined)[]).slice(1)).toEqual([
      'namespace',
      'key',
      'en',
      'de',
    ]);
  });

  it('supports recursive namespace strings such as auth/login', async () => {
    const file = join(tmpDir, 'recursive-namespace.xlsx');
    await exportToExcel({
      file,
      files: [{ locale: 'en', namespace: 'auth/login', translations: { title: 'Sign in' } }],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    const sheet = workbook.worksheets[0]!;
    expect((sheet.getRow(2).values as (string | undefined)[]).slice(1, 3)).toEqual([
      'auth/login',
      'title',
    ]);
  });

  it('imports per-locale per-namespace trees', async () => {
    const file = join(tmpDir, 'namespaced-import.xlsx');
    await writeWorkbook(file, [
      ['namespace', 'key', 'en', 'de'],
      ['common', 'app.name', 'LangSync', 'LangSync'],
      ['auth/login', 'title', 'Sign in', 'Anmelden'],
    ]);

    const result = await importFromExcel(file);
    const byLocaleNamespace = Object.fromEntries(
      result.locales.map((entry) => [`${entry.locale}:${entry.namespace}`, entry.translations]),
    );

    expect(result.format).toBe('namespaced');
    expect(byLocaleNamespace['en:common']).toEqual({ app: { name: 'LangSync' } });
    expect(byLocaleNamespace['de:common']).toEqual({ app: { name: 'LangSync' } });
    expect(byLocaleNamespace['en:auth/login']).toEqual({ title: 'Sign in' });
    expect(byLocaleNamespace['de:auth/login']).toEqual({ title: 'Anmelden' });
  });

  it('round-trips namespaced data and reports namespaced format', async () => {
    const file = join(tmpDir, 'namespaced-roundtrip.xlsx');
    const files: NamespacedFile[] = [
      { locale: 'en', namespace: 'common', translations: { app: { name: 'LangSync' } } },
      { locale: 'de', namespace: 'common', translations: { app: { name: 'LangSync' } } },
      { locale: 'en', namespace: 'auth/login', translations: { title: 'Sign in' } },
      { locale: 'de', namespace: 'auth/login', translations: { title: 'Anmelden' } },
    ];

    await exportToExcel({ file, files });
    const result = await importFromExcel(file);

    const byLocaleNamespace = Object.fromEntries(
      result.locales.map((entry) => [`${entry.locale}:${entry.namespace}`, entry.translations]),
    );
    expect(result.format).toBe('namespaced');
    for (const entry of files) {
      expect(byLocaleNamespace[`${entry.locale}:${entry.namespace}`]).toEqual(entry.translations);
    }
  });

  it('throws for duplicate (namespace, key) rows', async () => {
    const file = join(tmpDir, 'duplicates.xlsx');
    await writeWorkbook(file, [
      ['namespace', 'key', 'en'],
      ['common', 'app.name', 'LangSync'],
      ['common', 'app.name', 'Duplicate'],
    ]);

    await expect(importFromExcel(file)).rejects.toThrow(
      'Duplicate (namespace, key) row: "common" / "app.name".',
    );
  });

  it('throws for a blank namespace cell', async () => {
    const file = join(tmpDir, 'blank-namespace.xlsx');
    await writeWorkbook(file, [
      ['namespace', 'key', 'en'],
      ['', 'app.name', 'LangSync'],
    ]);

    await expect(importFromExcel(file)).rejects.toThrow(
      'Row 2: namespace cell must not be empty in a namespaced workbook.',
    );
  });

  it('throws for an unrecognized header', async () => {
    const file = join(tmpDir, 'unknown-header.xlsx');
    await writeWorkbook(file, [
      ['unknown', 'en'],
      ['app.name', 'LangSync'],
    ]);

    await expect(importFromExcel(file)).rejects.toThrow(
      'Unrecognized workbook header. Expected "key" (single-file) or "namespace","key" (namespaced).',
    );
  });
});
