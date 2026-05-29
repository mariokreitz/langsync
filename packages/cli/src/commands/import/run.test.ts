import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedFs from '@langsync/shared/fs';

vi.mock('@langsync/shared/config', () => ({ loadConfig: vi.fn() }));
vi.mock('@langsync/shared/fs', async () => {
  const actual = await vi.importActual<typeof SharedFs>('@langsync/shared/fs');
  return { ...actual, writeJson: vi.fn() };
});
vi.mock('@langsync/excel-engine', () => ({ importFromExcel: vi.fn() }));

import { importFromExcel } from '@langsync/excel-engine';
import { loadConfig } from '@langsync/shared/config';
import { writeJson } from '@langsync/shared/fs';
import { runImportExcel } from './run.js';

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedWriteJson = vi.mocked(writeJson);
const mockedImportFromExcel = vi.mocked(importFromExcel);

describe('runImportExcel', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedWriteJson.mockReset();
    mockedImportFromExcel.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('keeps single-file imports writing `<input>/<locale>.json`', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './o',
        locales: ['en', 'de'],
        excel: { file: 'translations.xlsx', sheetName: 'Translations' },
      },
      filepath: '/p/langsync.config.ts',
    });
    mockedImportFromExcel.mockResolvedValue({
      format: 'single-file',
      locales: [
        { locale: 'en', namespace: null, translations: { hi: 'Hi' } },
        { locale: 'de', namespace: null, translations: { hi: 'Hallo' } },
      ],
    });

    const result = await runImportExcel({ cwd: '/p' });

    expect(mockedImportFromExcel).toHaveBeenCalledWith('/p/translations.xlsx', 'Translations');
    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/en.json', { hi: 'Hi' });
    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de.json', { hi: 'Hallo' });
    expect(result.written).toEqual(['/p/i18n/en.json', '/p/i18n/de.json']);
  });

  it('writes namespaced locale-dir JSON files to resolved paths', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './o',
        locales: ['en', 'de'],
        namespaces: { structure: 'locale-dir' },
      },
      filepath: '/p/langsync.config.ts',
    });
    mockedImportFromExcel.mockResolvedValue({
      format: 'namespaced',
      locales: [
        { locale: 'en', namespace: 'auth/login', translations: { title: 'Login' } },
        { locale: 'de', namespace: 'common', translations: { ok: 'OK' } },
      ],
    });

    const result = await runImportExcel({ cwd: '/p' });

    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/en/auth/login.json', { title: 'Login' });
    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de/common.json', { ok: 'OK' });
    expect(result.planned).toEqual(['/p/i18n/en/auth/login.json', '/p/i18n/de/common.json']);
  });

  it('plans namespaced locale-prefix writes in dry-run without writing', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './o',
        locales: ['en'],
        namespaces: { structure: 'locale-prefix' },
      },
      filepath: '/p/langsync.config.ts',
    });
    mockedImportFromExcel.mockResolvedValue({
      format: 'namespaced',
      locales: [{ locale: 'en', namespace: 'admin.users', translations: { title: 'Users' } }],
    });

    const result = await runImportExcel({ cwd: '/p', dryRun: true });

    expect(mockedWriteJson).not.toHaveBeenCalled();
    expect(result.written).toEqual([]);
    expect(result.planned).toEqual(['/p/i18n/en.admin.users.json']);
  });

  it('rejects namespaced workbooks in single-file projects without writing files', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en'] },
      filepath: '/p/langsync.config.ts',
    });
    mockedImportFromExcel.mockResolvedValue({
      format: 'namespaced',
      locales: [{ locale: 'en', namespace: 'common', translations: { hi: 'Hi' } }],
    });

    await expect(runImportExcel({ cwd: '/p' })).rejects.toThrow(
      'Cannot import a namespaced workbook into a single-file project',
    );
    expect(mockedWriteJson).not.toHaveBeenCalled();
  });

  it('rejects single-file workbooks in namespaced projects without writing files', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './o',
        locales: ['en'],
        namespaces: { structure: 'locale-dir' },
      },
      filepath: '/p/langsync.config.ts',
    });
    mockedImportFromExcel.mockResolvedValue({
      format: 'single-file',
      locales: [{ locale: 'en', namespace: null, translations: { hi: 'Hi' } }],
    });

    await expect(runImportExcel({ cwd: '/p' })).rejects.toThrow(
      'Cannot import a single-file workbook into a namespaced project',
    );
    expect(mockedWriteJson).not.toHaveBeenCalled();
  });

  it('skips locales not present in the configured locale list', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en'] },
      filepath: '/p/langsync.config.ts',
    });
    mockedImportFromExcel.mockResolvedValue({
      format: 'single-file',
      locales: [
        { locale: 'en', namespace: null, translations: { hi: 'Hi' } },
        { locale: 'jp', namespace: null, translations: { hi: 'Konnichiwa' } },
      ],
    });

    const result = await runImportExcel({ cwd: '/p' });
    expect(mockedWriteJson).toHaveBeenCalledTimes(1);
    expect(result.written).toEqual(['/p/i18n/en.json']);
    expect(result.skipped).toEqual(['jp']);
  });
});
