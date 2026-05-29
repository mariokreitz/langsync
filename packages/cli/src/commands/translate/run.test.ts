import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedFs from '@langsync/shared/fs';

vi.mock('@langsync/shared/config', () => ({ loadConfig: vi.fn() }));
vi.mock('@langsync/shared/fs', async () => {
  const actual = await vi.importActual<typeof SharedFs>('@langsync/shared/fs');
  return { ...actual, loadLocaleFiles: vi.fn(), writeJson: vi.fn() };
});
vi.mock('@langsync/ai-engine', async () => {
  const actual = await vi.importActual<typeof AiEngine>('@langsync/ai-engine');
  return { ...actual, createAdapter: vi.fn() };
});

import type * as AiEngine from '@langsync/ai-engine';
import { createAdapter, type TranslateRequest, type TranslationAdapter } from '@langsync/ai-engine';
import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles, writeJson, type LoadedLocaleFile } from '@langsync/shared/fs';
import { runTranslate } from './run.js';

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadLocaleFiles = vi.mocked(loadLocaleFiles);
const mockedWriteJson = vi.mocked(writeJson);
const mockedCreateAdapter = vi.mocked(createAdapter);

function fakeAdapter(): TranslationAdapter {
  return {
    provider: 'openai',
    translate: (req: TranslateRequest) => Promise.resolve(`tr(${req.text})`),
  };
}

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

const baseConfig = {
  config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
  filepath: '/p/langsync.config.ts',
};

describe('runTranslate', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedLoadLocaleFiles.mockReset();
    mockedWriteJson.mockReset();
    mockedCreateAdapter.mockReset();
    mockedCreateAdapter.mockReturnValue(fakeAdapter());
  });
  afterEach(() => vi.clearAllMocks());

  it('keeps single-file translation behavior with structured result entries', async () => {
    mockedLoadConfig.mockResolvedValue(baseConfig);
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', null, { a: 'A', b: 'B' }),
      file('de', null, { a: 'AA', b: '' }),
    ]);

    const result = await runTranslate({ cwd: '/p' });

    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de.json', { a: 'AA', b: 'tr(B)' });
    expect(result.translatedByLocale.de).toEqual([
      { namespace: null, key: 'b', path: '/p/i18n/de.json' },
    ]);
    expect(result.skippedByLocale).toEqual({});
    expect(result.totalTranslatableKeys).toBe(1);
  });

  it('translates missing values across multiple namespaces and creates missing target files', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-dir' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', 'auth/login', { title: 'Login' }),
      file('en', 'common', { ok: 'OK' }),
      file('de', 'auth/login', {}, false),
      file('de', 'common', { ok: '' }),
    ]);

    const result = await runTranslate({ cwd: '/p' });

    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de/auth/login.json', {
      title: 'tr(Login)',
    });
    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de/common.json', { ok: 'tr(OK)' });
    expect(result.planned).toEqual(['/p/i18n/de/auth/login.json', '/p/i18n/de/common.json']);
    expect(result.translatedByLocale.de).toEqual([
      { namespace: 'auth/login', key: 'title', path: '/p/i18n/de/auth/login.json' },
      { namespace: 'common', key: 'ok', path: '/p/i18n/de/common.json' },
    ]);
  });

  it('honors maxKeys across locale and namespace candidate ordering', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: {
        input: './i18n',
        output: './o',
        locales: ['en', 'de', 'fr'],
        defaultLocale: 'en',
        namespaces: { structure: 'locale-dir' },
      },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', 'a', { one: 'One', two: 'Two' }),
      file('en', 'b', { three: 'Three' }),
      file('de', 'a', {}),
      file('de', 'b', {}),
      file('fr', 'a', {}),
      file('fr', 'b', {}),
    ]);

    const result = await runTranslate({ cwd: '/p', maxKeys: 2 });

    expect(result.totalTranslatableKeys).toBe(6);
    expect(result.translatedByLocale.de).toEqual([
      { namespace: 'a', key: 'one', path: '/p/i18n/de/a.json' },
      { namespace: 'a', key: 'two', path: '/p/i18n/de/a.json' },
    ]);
    expect(result.skippedByLocale.de).toEqual([
      { namespace: 'b', key: 'three', path: '/p/i18n/de/b.json' },
    ]);
    expect(result.skippedByLocale.fr).toHaveLength(3);
    expect(mockedWriteJson).toHaveBeenCalledTimes(1);
  });

  it('records intra-file skipped keys exactly once when a single file is partially budgeted', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-dir' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', 'a', { one: 'One', two: 'Two', three: 'Three' }),
      file('de', 'a', { one: '', two: '', three: '' }),
    ]);

    const result = await runTranslate({ cwd: '/p', maxKeys: 1 });

    expect(result.totalTranslatableKeys).toBe(3);
    expect(mockedWriteJson).toHaveBeenCalledTimes(1);
    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de/a.json', {
      one: 'tr(One)',
      two: '',
      three: '',
    });
    expect(result.translatedByLocale.de).toEqual([
      { namespace: 'a', key: 'one', path: '/p/i18n/de/a.json' },
    ]);
    expect(result.skippedByLocale.de).toEqual([
      { namespace: 'a', key: 'two', path: '/p/i18n/de/a.json' },
      { namespace: 'a', key: 'three', path: '/p/i18n/de/a.json' },
    ]);
  });

  it('leaves extra target-only namespaces untouched', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-dir' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', 'legacy', {}, false),
      file('de', 'legacy', { old: '' }),
    ]);

    const result = await runTranslate({ cwd: '/p' });

    expect(mockedWriteJson).not.toHaveBeenCalled();
    expect(result.totalTranslatableKeys).toBe(0);
    expect(result.planned).toEqual([]);
  });

  it('honors dryRun for namespaced writes', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-prefix' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      { ...file('en', 'common', { a: 'A' }), path: '/p/i18n/en.common.json' },
      { ...file('de', 'common', { a: '' }), path: '/p/i18n/de.common.json' },
    ]);

    const result = await runTranslate({ cwd: '/p', dryRun: true });

    expect(mockedWriteJson).not.toHaveBeenCalled();
    expect(result.written).toEqual([]);
    expect(result.planned).toEqual(['/p/i18n/de.common.json']);
  });

  it('throws D10 before creating an adapter when no namespaces are discovered', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, namespaces: { structure: 'locale-dir' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([]);

    await expect(runTranslate({ cwd: '/p' })).rejects.toThrow(
      'No namespace files found under "./i18n"',
    );
    expect(mockedCreateAdapter).not.toHaveBeenCalled();
  });

  it('passes provider and model overrides to the adapter factory', async () => {
    mockedLoadConfig.mockResolvedValue({
      ...baseConfig,
      config: { ...baseConfig.config, ai: { provider: 'anthropic', model: 'config-model' } },
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      file('en', null, { a: 'A' }),
      file('de', null, { a: 'AA' }),
    ]);

    const result = await runTranslate({ cwd: '/p', provider: 'openai', model: 'flag-model' });

    expect(mockedCreateAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai', model: 'flag-model' }),
    );
    expect(result.provider).toBe('openai');
  });

  it('throws when no config is found', async () => {
    mockedLoadConfig.mockResolvedValue(null);
    await expect(runTranslate({ cwd: '/p' })).rejects.toThrow(/No LangSync config/);
  });
});
