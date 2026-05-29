import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@langsync/shared/config', () => ({ loadConfig: vi.fn() }));
vi.mock('@langsync/shared/fs', () => ({
  loadLocaleFiles: vi.fn(),
  writeJson: vi.fn(),
}));
vi.mock('../sync/run.js', () => ({ runSync: vi.fn() }));

import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles } from '@langsync/shared/fs';
import { runSync } from '../sync/run.js';
import { resolveWatchDir, runWatchPass } from './run.js';

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadLocaleFiles = vi.mocked(loadLocaleFiles);
const mockedRunSync = vi.mocked(runSync);

const config = {
  config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
  filepath: '/p/langsync.config.ts',
};

describe('resolveWatchDir', () => {
  beforeEach(() => mockedLoadConfig.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('resolves the input dir against cwd', async () => {
    mockedLoadConfig.mockResolvedValue(config);
    await expect(resolveWatchDir('/p')).resolves.toBe('/p/i18n');
  });

  it('throws without config', async () => {
    mockedLoadConfig.mockResolvedValue(null);
    await expect(resolveWatchDir('/p')).rejects.toThrow(/No LangSync config/);
  });
});

describe('runWatchPass', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedLoadLocaleFiles.mockReset();
    mockedRunSync.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('syncs then validates and reports remaining issues', async () => {
    mockedRunSync.mockResolvedValue({
      referenceLocale: 'en',
      written: ['/p/i18n/de.json'],
      planned: ['/p/i18n/de.json'],
    });
    mockedLoadConfig.mockResolvedValue(config);
    mockedLoadLocaleFiles.mockResolvedValue([
      { locale: 'en', path: '/p/i18n/en.json', translations: { a: 'A' } },
      { locale: 'de', path: '/p/i18n/de.json', translations: { a: '' } },
    ]);

    const result = await runWatchPass({ cwd: '/p' });

    expect(result.referenceLocale).toBe('en');
    expect(result.written).toEqual(['/p/i18n/de.json']);
    // de.a is empty -> one validation issue
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ type: 'empty', locale: 'de', key: 'a' });
  });
});
