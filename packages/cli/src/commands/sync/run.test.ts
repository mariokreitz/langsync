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

const baseConfig = {
  config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
  filepath: '/p/langsync.config.ts',
};

describe('runSync', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedLoadLocaleFiles.mockReset();
    mockedWriteJson.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('throws and loads no files when namespaces are configured', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-dir' } },
    });
    await expect(runSync({ cwd: '/p' })).rejects.toThrow(/follow-up release/i);
    expect(mockedLoadLocaleFiles).not.toHaveBeenCalled();
  });

  it('writes synced trees for every non-reference locale that has changes', async () => {
    mockedLoadConfig.mockResolvedValue(baseConfig);
    mockedLoadLocaleFiles.mockResolvedValue([
      {
        locale: 'en',
        namespace: null,
        path: '/p/i18n/en.json',
        exists: true,
        translations: { a: 'A', b: 'B' },
      },
      {
        locale: 'de',
        namespace: null,
        path: '/p/i18n/de.json',
        exists: true,
        translations: { a: 'AA' },
      },
    ]);

    const result = await runSync({ cwd: '/p' });

    expect(mockedWriteJson).toHaveBeenCalledTimes(1);
    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de.json', { a: 'AA', b: '' });
    expect(result.written).toEqual(['/p/i18n/de.json']);
    expect(result.unchanged).toEqual([]);
  });

  it('skips writing when locale is already in sync with the reference', async () => {
    mockedLoadConfig.mockResolvedValue(baseConfig);
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
        translations: { a: 'AA' },
      },
    ]);

    const result = await runSync({ cwd: '/p' });

    // de has no missing/extra keys after sync — should be skipped
    expect(mockedWriteJson).not.toHaveBeenCalled();
    expect(result.written).toEqual([]);
    expect(result.planned).toEqual([]);
    expect(result.unchanged).toEqual(['/p/i18n/de.json']);
  });

  it('does not write to the reference locale file', async () => {
    mockedLoadConfig.mockResolvedValue(baseConfig);
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
        translations: { a: 'AA' },
      },
    ]);

    await runSync({ cwd: '/p' });
    const targets = mockedWriteJson.mock.calls.map((c) => c[0]);
    expect(targets).not.toContain('/p/i18n/en.json');
  });

  it('honors dryRun: reports planned writes without touching disk', async () => {
    mockedLoadConfig.mockResolvedValue(baseConfig);
    mockedLoadLocaleFiles.mockResolvedValue([
      {
        locale: 'en',
        namespace: null,
        path: '/p/i18n/en.json',
        exists: true,
        translations: { a: 'A', b: 'B' },
      },
      {
        locale: 'de',
        namespace: null,
        path: '/p/i18n/de.json',
        exists: true,
        translations: { a: 'AA' },
      },
    ]);

    const result = await runSync({ cwd: '/p', dryRun: true });
    expect(mockedWriteJson).not.toHaveBeenCalled();
    expect(result.written).toEqual([]);
    expect(result.planned).toEqual(['/p/i18n/de.json']);
    expect(result.unchanged).toEqual([]);
  });

  it('populates diffsByPath for changed files', async () => {
    mockedLoadConfig.mockResolvedValue(baseConfig);
    mockedLoadLocaleFiles.mockResolvedValue([
      {
        locale: 'en',
        namespace: null,
        path: '/p/i18n/en.json',
        exists: true,
        translations: { a: 'A', b: 'B' },
      },
      {
        locale: 'de',
        namespace: null,
        path: '/p/i18n/de.json',
        exists: true,
        translations: { a: 'AA' },
      },
    ]);

    const result = await runSync({ cwd: '/p', dryRun: true });
    expect(result.diffsByPath['/p/i18n/de.json']).toBeDefined();
    expect(result.diffsByPath['/p/i18n/de.json']!.added).toContain('b');
  });

  it('does not populate diffsByPath for unchanged files', async () => {
    mockedLoadConfig.mockResolvedValue(baseConfig);
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
        translations: { a: 'AA' },
      },
    ]);

    const result = await runSync({ cwd: '/p' });
    expect(result.diffsByPath['/p/i18n/de.json']).toBeUndefined();
  });

  it('throws when reference locale file is not present', async () => {
    mockedLoadConfig.mockResolvedValue(baseConfig);
    mockedLoadLocaleFiles.mockResolvedValue([
      { locale: 'de', namespace: null, path: '/p/i18n/de.json', exists: true, translations: {} },
    ]);

    await expect(runSync({ cwd: '/p' })).rejects.toThrow(/reference locale/i);
  });

  it('throws when config is not found', async () => {
    mockedLoadConfig.mockResolvedValue(null);

    await expect(runSync({ cwd: '/p' })).rejects.toThrow(/langsync init/i);
  });
});
