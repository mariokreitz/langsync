import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@langsync/shared/config', () => ({ loadConfig: vi.fn() }));
vi.mock('@langsync/shared/fs', () => ({
  loadLocaleFiles: vi.fn(),
  writeJson: vi.fn(),
}));

import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles, writeJson } from '@langsync/shared/fs';
import { runSync } from './run.js';

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadLocaleFiles = vi.mocked(loadLocaleFiles);
const mockedWriteJson = vi.mocked(writeJson);

describe('runSync', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedLoadLocaleFiles.mockReset();
    mockedWriteJson.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('writes synced trees for every non-reference locale', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      { locale: 'en', path: '/p/i18n/en.json', translations: { a: 'A', b: 'B' } },
      { locale: 'de', path: '/p/i18n/de.json', translations: { a: 'AA' } },
    ]);

    const result = await runSync({ cwd: '/p' });

    expect(mockedWriteJson).toHaveBeenCalledTimes(1);
    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de.json', { a: 'AA', b: '' });
    expect(result.written).toEqual(['/p/i18n/de.json']);
  });

  it('does not write to the reference locale file', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      { locale: 'en', path: '/p/i18n/en.json', translations: { a: 'A' } },
      { locale: 'de', path: '/p/i18n/de.json', translations: { a: 'AA' } },
    ]);

    await runSync({ cwd: '/p' });
    const targets = mockedWriteJson.mock.calls.map((c) => c[0]);
    expect(targets).not.toContain('/p/i18n/en.json');
  });

  it('honors dryRun: reports planned writes without touching disk', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      { locale: 'en', path: '/p/i18n/en.json', translations: { a: 'A', b: 'B' } },
      { locale: 'de', path: '/p/i18n/de.json', translations: { a: 'AA' } },
    ]);

    const result = await runSync({ cwd: '/p', dryRun: true });
    expect(mockedWriteJson).not.toHaveBeenCalled();
    expect(result.written).toEqual([]);
    expect(result.planned).toEqual(['/p/i18n/de.json']);
  });

  it('throws when reference locale file is not present', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      { locale: 'de', path: '/p/i18n/de.json', translations: {} },
    ]);

    await expect(runSync({ cwd: '/p' })).rejects.toThrow(/reference locale/i);
  });
});

