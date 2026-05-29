import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@langsync/shared/config', () => ({ loadConfig: vi.fn() }));
vi.mock('@langsync/shared/fs', () => ({ writeJson: vi.fn() }));
vi.mock('@langsync/excel-engine', () => ({ importFromExcel: vi.fn() }));

import { loadConfig } from '@langsync/shared/config';
import { writeJson } from '@langsync/shared/fs';
import { importFromExcel } from '@langsync/excel-engine';
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

  it('throws and imports nothing when namespaces are configured', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './o',
        locales: ['en', 'de'],
        excel: { file: 'translations.xlsx', sheetName: 'Translations' },
        namespaces: { structure: 'locale-dir' },
      },
      filepath: '/p/langsync.config.ts',
    });
    await expect(runImportExcel({ cwd: '/p' })).rejects.toThrow(/follow-up release/i);
    expect(mockedImportFromExcel).not.toHaveBeenCalled();
    expect(mockedWriteJson).not.toHaveBeenCalled();
  });

  it('writes each imported locale into `<input>/<locale>.json`', async () => {
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
      locales: [
        { locale: 'en', translations: { hi: 'Hi' } },
        { locale: 'de', translations: { hi: 'Hallo' } },
      ],
    });

    const result = await runImportExcel({ cwd: '/p' });

    expect(mockedImportFromExcel).toHaveBeenCalledWith('/p/translations.xlsx', 'Translations');
    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/en.json', { hi: 'Hi' });
    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de.json', { hi: 'Hallo' });
    expect(result.written).toEqual(['/p/i18n/en.json', '/p/i18n/de.json']);
  });

  it('honors dryRun: reports planned writes without touching disk', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en'] },
      filepath: '/p/langsync.config.ts',
    });
    mockedImportFromExcel.mockResolvedValue({
      locales: [{ locale: 'en', translations: { hi: 'Hi' } }],
    });

    const result = await runImportExcel({ cwd: '/p', dryRun: true });
    expect(mockedWriteJson).not.toHaveBeenCalled();
    expect(result.written).toEqual([]);
    expect(result.planned).toEqual(['/p/i18n/en.json']);
  });

  it('skips locales not present in the configured locale list', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en'] },
      filepath: '/p/langsync.config.ts',
    });
    mockedImportFromExcel.mockResolvedValue({
      locales: [
        { locale: 'en', translations: { hi: 'Hi' } },
        { locale: 'jp', translations: { hi: 'Konnichiwa' } },
      ],
    });

    const result = await runImportExcel({ cwd: '/p' });
    expect(mockedWriteJson).toHaveBeenCalledTimes(1);
    expect(result.written).toEqual(['/p/i18n/en.json']);
    expect(result.skipped).toEqual(['jp']);
  });
});
