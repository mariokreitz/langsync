import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedFs from '@langsync/shared/fs';

vi.mock('@langsync/shared/config', () => ({ loadConfig: vi.fn() }));
vi.mock('@langsync/shared/fs', async () => {
  const actual = await vi.importActual<typeof SharedFs>('@langsync/shared/fs');
  return { ...actual, loadLocaleFiles: vi.fn() };
});
vi.mock('@langsync/excel-engine', () => ({ exportToExcel: vi.fn() }));

import { exportToExcel } from '@langsync/excel-engine';
import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles, type LoadedLocaleFile } from '@langsync/shared/fs';
import { runExportExcel } from './run.js';

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadLocaleFiles = vi.mocked(loadLocaleFiles);
const mockedExportToExcel = vi.mocked(exportToExcel);

function file(locale: string, namespace: string | null, translations: object): LoadedLocaleFile {
  const path =
    namespace === null ? `/p/i18n/${locale}.json` : `/p/i18n/${locale}/${namespace}.json`;
  return { locale, namespace, path, exists: true, translations };
}

describe('runExportExcel', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedLoadLocaleFiles.mockReset();
    mockedExportToExcel.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('still exports single-file projects', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './o',
        locales: ['en', 'de'],
        excel: { file: 'i18n.xlsx', sheetName: 'Sheet' },
      },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', null, { a: 'A' }),
      file('de', null, { a: 'A' }),
    ]);
    mockedExportToExcel.mockResolvedValue();

    const result = await runExportExcel({ cwd: '/p' });

    expect(mockedExportToExcel).toHaveBeenCalledWith({
      file: '/p/i18n.xlsx',
      sheetName: 'Sheet',
      files: [
        { locale: 'en', namespace: null, translations: { a: 'A' } },
        { locale: 'de', namespace: null, translations: { a: 'A' } },
      ],
    });
    expect(result).toMatchObject({ file: '/p/i18n.xlsx', namespaces: [] });
  });

  it('passes namespace-aware input to the excel engine and returns namespaces', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './o',
        locales: ['en', 'de'],
        namespaces: { structure: 'locale-dir' },
      },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', 'common', { ok: 'OK' }),
      file('en', 'auth/login', { title: 'Login' }),
      file('de', 'common', { ok: 'Okay' }),
      file('de', 'auth/login', {}),
    ]);
    mockedExportToExcel.mockResolvedValue();

    const result = await runExportExcel({ cwd: '/p' });

    const exportArg = mockedExportToExcel.mock.calls[0]![0];
    expect(exportArg.files).toEqual(
      expect.arrayContaining([
        { locale: 'en', namespace: 'auth/login', translations: { title: 'Login' } },
        { locale: 'de', namespace: 'common', translations: { ok: 'Okay' } },
      ]),
    );
    expect(result.namespaces).toEqual(['auth/login', 'common']);
  });

  it('throws the shared D10 error when no namespaces are discovered', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './o',
        locales: ['en'],
        defaultLocale: 'en',
        namespaces: { structure: 'locale-prefix' },
      },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([]);

    await expect(runExportExcel({ cwd: '/p' })).rejects.toThrow(
      'No namespace files found under "./i18n"',
    );
    expect(mockedExportToExcel).not.toHaveBeenCalled();
  });

  it('uses file and sheet defaults and overrides', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en'] },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([file('en', null, {})]);
    mockedExportToExcel.mockResolvedValue();

    const result = await runExportExcel({ cwd: '/p', file: 'custom.xlsx', sheetName: 'Custom' });

    expect(result.file).toBe('/p/custom.xlsx');
    expect(result.sheetName).toBe('Custom');
  });
});
