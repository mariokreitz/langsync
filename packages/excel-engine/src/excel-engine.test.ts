import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { exportToExcel, importFromExcel } from './index.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'langsync-excel-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('excel-engine round-trip', () => {
  it('exportToExcel -> importFromExcel reproduces input translations', async () => {
    const file = join(tmpDir, 'translations.xlsx');
    const locales = [
      {
        locale: 'en',
        translations: { greeting: { hello: 'Hello', bye: 'Bye' }, app: { name: 'LangSync' } },
      },
      {
        locale: 'de',
        translations: { greeting: { hello: 'Hallo', bye: 'Tschuess' }, app: { name: 'LangSync' } },
      },
    ];

    await exportToExcel({ file, locales });
    const result = await importFromExcel(file);

    const byLocale = Object.fromEntries(result.locales.map((l) => [l.locale, l.translations]));
    expect(byLocale.en).toEqual(locales[0]!.translations);
    expect(byLocale.de).toEqual(locales[1]!.translations);
  });

  it('writes a header row ["key", ...locales]', async () => {
    const file = join(tmpDir, 'header.xlsx');
    await exportToExcel({
      file,
      locales: [
        { locale: 'en', translations: { a: 'A' } },
        { locale: 'de', translations: { a: 'A' } },
      ],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const sheet = wb.worksheets[0]!;
    const header = (sheet.getRow(1).values as (string | undefined)[]).slice(1);
    expect(header).toEqual(['key', 'en', 'de']);
  });

  it('sorts keys alphabetically in the exported workbook', async () => {
    const file = join(tmpDir, 'sorted.xlsx');
    await exportToExcel({
      file,
      locales: [{ locale: 'en', translations: { zeta: 'Z', alpha: 'A', mid: 'M' } }],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const sheet = wb.worksheets[0]!;
    const keys: string[] = [];
    sheet.eachRow((row, n) => {
      if (n === 1) return;
      keys.push((row.values as (string | undefined)[])[1] ?? '');
    });
    expect(keys).toEqual(['alpha', 'mid', 'zeta']);
  });

  it('throws when the requested worksheet is missing', async () => {
    const file = join(tmpDir, 'nosheet.xlsx');
    await exportToExcel({
      file,
      sheetName: 'A',
      locales: [{ locale: 'en', translations: { x: 'X' } }],
    });
    await expect(importFromExcel(file, 'DoesNotExist')).rejects.toThrow(/Worksheet not found/);
  });
});
