import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedFs from '@langsync/shared/fs';

vi.mock('@langsync/shared/config', () => ({ loadConfig: vi.fn() }));
vi.mock('@langsync/shared/fs', async () => {
  const actual = await vi.importActual<typeof SharedFs>('@langsync/shared/fs');
  return { ...actual, loadLocaleFiles: vi.fn() };
});

import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles, type LoadedLocaleFile } from '@langsync/shared/fs';
import { runFindMissing } from './run.js';

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadLocaleFiles = vi.mocked(loadLocaleFiles);

function file(
  locale: string,
  namespace: string | null,
  translations: object,
  exists = true,
): LoadedLocaleFile {
  const path =
    namespace === null ? `/p/i18n/${locale}.json` : `/p/i18n/${locale}/${namespace}.json`;
  return { locale, namespace, path, exists, translations };
}

describe('runFindMissing', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedLoadLocaleFiles.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('groups single-file missing keys with structured entries', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en', 'de', 'fr'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', null, { a: 'A', b: 'B', c: 'C' }),
      file('de', null, { a: 'A' }),
      file('fr', null, { a: 'A', b: 'B' }),
    ]);

    const result = await runFindMissing({ cwd: '/p' });

    expect(result.missingByLocale).toEqual({
      de: [
        { namespace: null, key: 'b', path: '/p/i18n/de.json' },
        { namespace: null, key: 'c', path: '/p/i18n/de.json' },
      ],
      fr: [{ namespace: null, key: 'c', path: '/p/i18n/fr.json' }],
    });
    expect(result.exitCode).toBe(1);
  });

  it('preserves and sorts namespace context in missing entries', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './o',
        locales: ['en', 'de'],
        defaultLocale: 'en',
        namespaces: { structure: 'locale-dir' },
      },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', 'z', { b: 'B' }),
      file('en', 'a', { c: 'C' }),
      file('de', 'z', {}),
      file('de', 'a', {}),
    ]);

    const result = await runFindMissing({ cwd: '/p' });

    expect(result.missingByLocale.de).toEqual([
      { namespace: 'a', key: 'c', path: '/p/i18n/de/a.json' },
      { namespace: 'z', key: 'b', path: '/p/i18n/de/z.json' },
    ]);
  });

  it('surfaces the shared D10 error from validate', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './o',
        locales: ['en', 'de'],
        defaultLocale: 'en',
        namespaces: { structure: 'locale-dir' },
      },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([]);

    await expect(runFindMissing({ cwd: '/p' })).rejects.toThrow(
      'No namespace files found under "./i18n"',
    );
  });

  it('returns exitCode 0 and empty map when nothing is missing', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', null, { a: 'A' }),
      file('de', null, { a: 'A' }),
    ]);

    const result = await runFindMissing({ cwd: '/p' });
    expect(result.missingByLocale).toEqual({});
    expect(result.exitCode).toBe(0);
  });
});
