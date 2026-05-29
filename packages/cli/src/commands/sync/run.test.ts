import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedFs from '@langsync/shared/fs';

vi.mock('@langsync/shared/config', () => ({ loadConfig: vi.fn() }));
vi.mock('@langsync/shared/fs', async () => {
  const actual = await vi.importActual<typeof SharedFs>('@langsync/shared/fs');
  return { ...actual, loadLocaleFiles: vi.fn(), writeJson: vi.fn() };
});

import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles, writeJson, type LoadedLocaleFile } from '@langsync/shared/fs';
import { runSync } from './run.js';

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadLocaleFiles = vi.mocked(loadLocaleFiles);
const mockedWriteJson = vi.mocked(writeJson);

const baseConfig = {
  config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
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

describe('runSync', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedLoadLocaleFiles.mockReset();
    mockedWriteJson.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('keeps single-file behavior unchanged', async () => {
    mockedLoadConfig.mockResolvedValue(baseConfig);
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', null, { a: 'A', b: 'B' }),
      file('de', null, { a: 'AA' }),
    ]);

    const result = await runSync({ cwd: '/p' });

    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de.json', { a: 'AA', b: '' });
    expect(result.written).toEqual(['/p/i18n/de.json']);
    expect(result.planned).toEqual(['/p/i18n/de.json']);
    expect(result.unchanged).toEqual([]);
    expect(result.diffsByPath['/p/i18n/de.json']!.added).toContain('b');
  });

  it('syncs locale-dir namespaces, creates missing target files, and tracks unchanged files', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-dir' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', 'auth/login', { title: 'Login' }),
      file('en', 'common', { ok: 'OK' }),
      file('de', 'auth/login', {}, false),
      file('de', 'common', { ok: 'Okay' }),
    ]);

    const result = await runSync({ cwd: '/p' });

    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de/auth/login.json', { title: '' });
    expect(result.planned).toEqual(['/p/i18n/de/auth/login.json']);
    expect(result.unchanged).toEqual(['/p/i18n/de/common.json']);
  });

  it('syncs locale-prefix namespaces to prefixed files in dry-run', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-prefix' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      { ...file('en', 'admin.users', { title: 'Users' }), path: '/p/i18n/en.admin.users.json' },
      { ...file('de', 'admin.users', {}), path: '/p/i18n/de.admin.users.json', exists: false },
    ]);

    const result = await runSync({ cwd: '/p', dryRun: true });

    expect(mockedWriteJson).not.toHaveBeenCalled();
    expect(result.written).toEqual([]);
    expect(result.planned).toEqual(['/p/i18n/de.admin.users.json']);
  });

  it('rewrites extra target-only namespaces to empty objects without deleting files', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-dir' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', 'legacy', {}, false),
      file('de', 'legacy', { old: 'Alt' }),
    ]);

    const result = await runSync({ cwd: '/p' });

    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de/legacy.json', {});
    expect(result.planned).toEqual(['/p/i18n/de/legacy.json']);
  });

  it('throws the shared D10 error when no namespaces are discovered', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-dir' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([]);

    await expect(runSync({ cwd: '/p' })).rejects.toThrow('No namespace files found under "./i18n"');
    expect(mockedWriteJson).not.toHaveBeenCalled();
  });

  it('throws when config is not found', async () => {
    mockedLoadConfig.mockResolvedValue(null);
    await expect(runSync({ cwd: '/p' })).rejects.toThrow(/langsync init/i);
  });
});
