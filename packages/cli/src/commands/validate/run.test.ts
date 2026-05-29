import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@langsync/shared/config', () => ({
  loadConfig: vi.fn(),
}));
vi.mock('@langsync/shared/fs', () => ({
  loadLocaleFiles: vi.fn(),
}));

import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles } from '@langsync/shared/fs';
import { runValidate } from './run.js';

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadLocaleFiles = vi.mocked(loadLocaleFiles);

describe('runValidate', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedLoadLocaleFiles.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('throws and loads no files when namespaces are configured', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './out',
        locales: ['en', 'de'],
        defaultLocale: 'en',
        namespaces: { structure: 'locale-dir' },
      },
      filepath: '/p/langsync.config.ts',
    });
    await expect(runValidate({ cwd: '/p' })).rejects.toThrow(/follow-up release/i);
    expect(mockedLoadLocaleFiles).not.toHaveBeenCalled();
  });

  it('returns exitCode 0 and no issues when locales are in sync', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './out', locales: ['en', 'de'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      {
        locale: 'en',
        namespace: null,
        path: '/p/i18n/en.json',
        exists: true,
        translations: { hi: 'Hi' },
      },
      {
        locale: 'de',
        namespace: null,
        path: '/p/i18n/de.json',
        exists: true,
        translations: { hi: 'Hallo' },
      },
    ]);

    const result = await runValidate({ cwd: '/p' });
    expect(result.issues).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it('returns exitCode 1 and a missing issue when a key is absent', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './out', locales: ['en', 'de'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      {
        locale: 'en',
        namespace: null,
        path: '/p/i18n/en.json',
        exists: true,
        translations: { hi: 'Hi', bye: 'Bye' },
      },
      {
        locale: 'de',
        namespace: null,
        path: '/p/i18n/de.json',
        exists: true,
        translations: { hi: 'Hallo' },
      },
    ]);

    const result = await runValidate({ cwd: '/p' });
    expect(result.exitCode).toBe(1);
    expect(result.issues).toContainEqual({ type: 'missing', locale: 'de', key: 'bye' });
  });

  it('treats empty values as warnings only (exitCode 0)', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './out', locales: ['en'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      {
        locale: 'en',
        namespace: null,
        path: '/p/i18n/en.json',
        exists: true,
        translations: { hi: '' },
      },
    ]);

    const result = await runValidate({ cwd: '/p' });
    expect(result.exitCode).toBe(0);
    expect(result.issues).toEqual([{ type: 'empty', locale: 'en', key: 'hi' }]);
  });

  it('throws when no config file is found', async () => {
    mockedLoadConfig.mockResolvedValue(null);
    await expect(runValidate({ cwd: '/p' })).rejects.toThrow(/No LangSync config/);
  });

  it('defaults defaultLocale to the first configured locale when omitted', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './out', locales: ['de', 'en'] },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      {
        locale: 'de',
        namespace: null,
        path: '/p/i18n/de.json',
        exists: true,
        translations: { hi: 'Hallo' },
      },
      { locale: 'en', namespace: null, path: '/p/i18n/en.json', exists: true, translations: {} },
    ]);

    const result = await runValidate({ cwd: '/p' });
    expect(result.referenceLocale).toBe('de');
    expect(result.issues).toContainEqual({ type: 'missing', locale: 'en', key: 'hi' });
  });
});
