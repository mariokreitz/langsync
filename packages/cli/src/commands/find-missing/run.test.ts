import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@langsync/shared/config', () => ({ loadConfig: vi.fn() }));
vi.mock('@langsync/shared/fs', () => ({ loadLocaleFiles: vi.fn() }));

import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles } from '@langsync/shared/fs';
import { runFindMissing } from './run.js';

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadLocaleFiles = vi.mocked(loadLocaleFiles);

describe('runFindMissing', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedLoadLocaleFiles.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('groups missing keys per locale and exits non-zero', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en', 'de', 'fr'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      {
        locale: 'en',
        namespace: null,
        path: '/p/i18n/en.json',
        exists: true,
        translations: { a: 'A', b: 'B', c: 'C' },
      },
      {
        locale: 'de',
        namespace: null,
        path: '/p/i18n/de.json',
        exists: true,
        translations: { a: 'A' },
      },
      {
        locale: 'fr',
        namespace: null,
        path: '/p/i18n/fr.json',
        exists: true,
        translations: { a: 'A', b: 'B' },
      },
    ]);

    const result = await runFindMissing({ cwd: '/p' });
    expect(result.missingByLocale).toEqual({
      de: ['b', 'c'],
      fr: ['c'],
    });
    expect(result.exitCode).toBe(1);
  });

  it('returns exitCode 0 and empty map when nothing is missing', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
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

    const result = await runFindMissing({ cwd: '/p' });
    expect(result.missingByLocale).toEqual({});
    expect(result.exitCode).toBe(0);
  });
});
