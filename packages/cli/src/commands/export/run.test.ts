import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@langsync/shared/config', () => ({ loadConfig: vi.fn() }));
vi.mock('@langsync/shared/fs', () => ({ loadLocaleFiles: vi.fn() }));
vi.mock('@langsync/excel-engine', () => ({ exportToExcel: vi.fn() }));

import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles } from '@langsync/shared/fs';
import { exportToExcel } from '@langsync/excel-engine';
import { runExportExcel } from './run.js';

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadLocaleFiles = vi.mocked(loadLocaleFiles);
const mockedExportToExcel = vi.mocked(exportToExcel);

describe('runExportExcel', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedLoadLocaleFiles.mockReset();
    mockedExportToExcel.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('throws and loads no files when namespaces are configured', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './o',
        locales: ['en', 'de'],
        excel: { file: 'i18n.xlsx', sheetName: 'Sheet' },
        namespaces: { structure: 'locale-prefix' },
      },
      filepath: '/p/langsync.config.ts',
    });
    await expect(runExportExcel({ cwd: '/p' })).rejects.toThrow(/follow-up release/i);
    expect(mockedLoadLocaleFiles).not.toHaveBeenCalled();
    expect(mockedExportToExcel).not.toHaveBeenCalled();
  });

  it('exports to the configured excel.file path', async () => {
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
      {
        locale: 'en',
        namespace: null,
        path: '/p/i18n/en.json',
        exists: true,
        translations: { a: 'A' },
      },
      {
        locale: 'de',
        namespace: null,
        path: '/p/i18n/de.json',
        exists: true,
        translations: { a: 'A' },
      },
    ]);
    mockedExportToExcel.mockResolvedValue();

    const result = await runExportExcel({ cwd: '/p' });

    expect(mockedExportToExcel).toHaveBeenCalledWith({
      file: '/p/i18n.xlsx',
      sheetName: 'Sheet',
      locales: [
        { locale: 'en', translations: { a: 'A' } },
        { locale: 'de', translations: { a: 'A' } },
      ],
    });
    expect(result.file).toBe('/p/i18n.xlsx');
  });

  it('falls back to translations.xlsx / Translations defaults when excel config missing', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en'] },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      { locale: 'en', namespace: null, path: '/p/i18n/en.json', exists: true, translations: {} },
    ]);
    mockedExportToExcel.mockResolvedValue();

    const result = await runExportExcel({ cwd: '/p' });

    expect(mockedExportToExcel).toHaveBeenCalledWith(
      expect.objectContaining({ file: '/p/translations.xlsx', sheetName: 'Translations' }),
    );
    expect(result.file).toBe('/p/translations.xlsx');
  });

  it('uses --file override when provided', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en'] },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      { locale: 'en', namespace: null, path: '/p/i18n/en.json', exists: true, translations: {} },
    ]);
    mockedExportToExcel.mockResolvedValue();

    const result = await runExportExcel({ cwd: '/p', file: 'custom.xlsx' });
    expect(result.file).toBe('/p/custom.xlsx');
  });
});
