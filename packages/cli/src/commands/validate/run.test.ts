import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedFs from '@langsync/shared/fs';

vi.mock('@langsync/shared/config', () => ({ loadConfig: vi.fn() }));
vi.mock('@langsync/shared/fs', async () => {
  const actual = await vi.importActual<typeof SharedFs>('@langsync/shared/fs');
  return { ...actual, loadLocaleFiles: vi.fn() };
});

import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles, type LoadedLocaleFile } from '@langsync/shared/fs';
import { runValidate } from './run.js';

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadLocaleFiles = vi.mocked(loadLocaleFiles);

const baseConfig = {
  config: { input: './i18n', output: './out', locales: ['en', 'de'], defaultLocale: 'en' },
  filepath: '/p/langsync.config.ts',
};

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

describe('runValidate', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedLoadLocaleFiles.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('keeps single-file validation semantics with namespace metadata', async () => {
    mockedLoadConfig.mockResolvedValue(baseConfig);
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', null, { hi: 'Hi', bye: 'Bye' }),
      file('de', null, { hi: '' }),
    ]);

    const result = await runValidate({ cwd: '/p' });

    expect(result.exitCode).toBe(1);
    expect(result.issues).toEqual([
      { type: 'missing', locale: 'de', key: 'bye', namespace: null, path: '/p/i18n/de.json' },
      { type: 'empty', locale: 'de', key: 'hi', namespace: null, path: '/p/i18n/de.json' },
    ]);
  });

  it('reports missing namespace files with namespace and path', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-dir' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', 'common', { hi: 'Hi', bye: 'Bye' }),
      file('de', 'common', {}, false),
    ]);

    const result = await runValidate({ cwd: '/p' });

    expect(result.exitCode).toBe(1);
    expect(result.issues).toEqual([
      {
        type: 'missing',
        locale: 'de',
        key: 'bye',
        namespace: 'common',
        path: '/p/i18n/de/common.json',
      },
      {
        type: 'missing',
        locale: 'de',
        key: 'hi',
        namespace: 'common',
        path: '/p/i18n/de/common.json',
      },
    ]);
  });

  it('reports extra target-only namespace keys while data exists', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-dir' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', 'legacy', {}, false),
      file('de', 'legacy', { old: 'Alt' }),
    ]);

    const result = await runValidate({ cwd: '/p' });

    expect(result.issues).toEqual([
      {
        type: 'extra',
        locale: 'de',
        key: 'old',
        namespace: 'legacy',
        path: '/p/i18n/de/legacy.json',
      },
    ]);
  });

  it('treats empty extra namespaces as inert after sync', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-dir' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', 'legacy', {}, false),
      file('de', 'legacy', {}),
    ]);

    const result = await runValidate({ cwd: '/p' });

    expect(result.issues).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it('throws the shared D10 error when no namespaces are discovered', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-prefix' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([]);

    await expect(runValidate({ cwd: '/p' })).rejects.toThrow(
      'No namespace files found under "./i18n"',
    );
  });

  it('defaults defaultLocale to the first configured locale when omitted', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './out', locales: ['de', 'en'] },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('de', null, { hi: 'Hallo' }),
      file('en', null, {}),
    ]);

    const result = await runValidate({ cwd: '/p' });
    expect(result.referenceLocale).toBe('de');
  });
});
