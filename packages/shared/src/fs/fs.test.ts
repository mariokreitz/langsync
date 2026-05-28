import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { vol } from 'memfs';
import { loadLocaleFiles } from './index.js';

vi.mock('node:fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

describe('loadLocaleFiles', () => {
  beforeEach(() => vol.reset());
  afterEach(() => vol.reset());

  it('loads each locale from `<inputDir>/<locale>.json`', async () => {
    vol.fromJSON({
      '/p/src/i18n/en.json': JSON.stringify({ hello: 'Hi' }),
      '/p/src/i18n/de.json': JSON.stringify({ hello: 'Hallo' }),
    });

    const files = await loadLocaleFiles({
      cwd: '/p',
      inputDir: './src/i18n',
      locales: ['en', 'de'],
    });

    expect(files).toEqual([
      { locale: 'en', path: '/p/src/i18n/en.json', translations: { hello: 'Hi' } },
      { locale: 'de', path: '/p/src/i18n/de.json', translations: { hello: 'Hallo' } },
    ]);
  });

  it('returns an empty translations tree when a locale file is missing', async () => {
    vol.fromJSON({ '/p/src/i18n/en.json': JSON.stringify({ hello: 'Hi' }) });

    const files = await loadLocaleFiles({
      cwd: '/p',
      inputDir: './src/i18n',
      locales: ['en', 'de'],
    });

    expect(files[1]).toEqual({
      locale: 'de',
      path: '/p/src/i18n/de.json',
      translations: {},
    });
  });

  it('throws a descriptive error when a locale file contains invalid JSON', async () => {
    vol.fromJSON({ '/p/src/i18n/en.json': '{ not json' });

    await expect(
      loadLocaleFiles({ cwd: '/p', inputDir: './src/i18n', locales: ['en'] }),
    ).rejects.toThrow(/en\.json/);
  });
});
