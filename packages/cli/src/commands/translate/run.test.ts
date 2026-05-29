import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@langsync/shared/config', () => ({ loadConfig: vi.fn() }));
vi.mock('@langsync/shared/fs', () => ({
  loadLocaleFiles: vi.fn(),
  writeJson: vi.fn(),
}));
vi.mock('@langsync/ai-engine', async () => {
  const actual = await vi.importActual<typeof AiEngine>('@langsync/ai-engine');
  return { ...actual, createAdapter: vi.fn() };
});

import type * as AiEngine from '@langsync/ai-engine';
import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles, writeJson } from '@langsync/shared/fs';
import { createAdapter, type TranslateRequest, type TranslationAdapter } from '@langsync/ai-engine';
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

describe('runTranslate', () => {
  beforeEach(() => {
    mockedLoadConfig.mockReset();
    mockedLoadLocaleFiles.mockReset();
    mockedWriteJson.mockReset();
    mockedCreateAdapter.mockReset();
    mockedCreateAdapter.mockReturnValue(fakeAdapter());
  });
  afterEach(() => vi.clearAllMocks());

  it('throws when no config is found', async () => {
    mockedLoadConfig.mockResolvedValue(null);
    await expect(runTranslate({ cwd: '/p' })).rejects.toThrow(/No LangSync config/);
  });

  it('fills empty target values and writes them', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      { locale: 'en', path: '/p/i18n/en.json', translations: { a: 'A', b: 'B' } },
      { locale: 'de', path: '/p/i18n/de.json', translations: { a: 'AA', b: '' } },
    ]);

    const result = await runTranslate({ cwd: '/p' });

    expect(mockedWriteJson).toHaveBeenCalledWith('/p/i18n/de.json', { a: 'AA', b: 'tr(B)' });
    expect(result.translatedByLocale.de).toEqual(['b']);
    expect(result.written).toEqual(['/p/i18n/de.json']);
  });

  it('honors dryRun and does not write', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      { locale: 'en', path: '/p/i18n/en.json', translations: { a: 'A' } },
      { locale: 'de', path: '/p/i18n/de.json', translations: { a: '' } },
    ]);

    const result = await runTranslate({ cwd: '/p', dryRun: true });

    expect(mockedWriteJson).not.toHaveBeenCalled();
    expect(result.written).toEqual([]);
    expect(result.planned).toEqual(['/p/i18n/de.json']);
  });

  it('passes the provider override to the adapter factory', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      { locale: 'en', path: '/p/i18n/en.json', translations: { a: 'A' } },
      { locale: 'de', path: '/p/i18n/de.json', translations: { a: 'AA' } },
    ]);

    await runTranslate({ cwd: '/p', provider: 'openai' });
    expect(mockedCreateAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai' }),
    );
  });

  it('throws when the reference locale file is missing', async () => {
    mockedLoadConfig.mockResolvedValue({
      config: { input: './i18n', output: './o', locales: ['en', 'de'], defaultLocale: 'en' },
      filepath: '/p/langsync.config.ts',
    });
    mockedLoadLocaleFiles.mockResolvedValue([
      { locale: 'de', path: '/p/i18n/de.json', translations: {} },
    ]);

    await expect(runTranslate({ cwd: '/p' })).rejects.toThrow(/reference locale/i);
  });
});
