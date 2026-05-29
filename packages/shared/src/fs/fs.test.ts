import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { vol } from 'memfs';
import {
  indexLocaleFiles,
  loadLocaleFiles,
  pathExists,
  readJson,
  resolveLocaleFilePath,
  writeJson,
  type LoadedLocaleFile,
} from './index.js';

vi.mock('node:fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

describe('loadLocaleFiles', () => {
  beforeEach(() => vol.reset());
  afterEach(() => vol.reset());

  it('loads single-file locale files with namespace and existence metadata', async () => {
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
      {
        locale: 'en',
        namespace: null,
        path: '/p/src/i18n/en.json',
        translations: { hello: 'Hi' },
        exists: true,
      },
      {
        locale: 'de',
        namespace: null,
        path: '/p/src/i18n/de.json',
        translations: { hello: 'Hallo' },
        exists: true,
      },
    ]);
  });

  it('returns an empty translations tree and exists false when a single-file locale is missing', async () => {
    vol.fromJSON({ '/p/src/i18n/en.json': JSON.stringify({ hello: 'Hi' }) });

    const files = await loadLocaleFiles({
      cwd: '/p',
      inputDir: './src/i18n',
      locales: ['en', 'de'],
    });

    expect(files[1]).toEqual({
      locale: 'de',
      namespace: null,
      path: '/p/src/i18n/de.json',
      translations: {},
      exists: false,
    });
  });

  it('throws a descriptive error when a single-file locale contains invalid JSON', async () => {
    vol.fromJSON({ '/p/src/i18n/en.json': '{ not json' });

    await expect(
      loadLocaleFiles({ cwd: '/p', inputDir: './src/i18n', locales: ['en'] }),
    ).rejects.toThrow(/Failed to parse en\.json/);
  });

  it('loads locale-dir namespace files', async () => {
    vol.fromJSON({
      '/p/src/i18n/en/common.json': JSON.stringify({ hello: 'Hi' }),
      '/p/src/i18n/de/common.json': JSON.stringify({ hello: 'Hallo' }),
    });

    const files = await loadLocaleFiles({
      cwd: '/p',
      inputDir: './src/i18n',
      locales: ['en', 'de'],
      namespaces: { structure: 'locale-dir' },
    });

    expect(files).toEqual([
      {
        locale: 'en',
        namespace: 'common',
        path: '/p/src/i18n/en/common.json',
        translations: { hello: 'Hi' },
        exists: true,
      },
      {
        locale: 'de',
        namespace: 'common',
        path: '/p/src/i18n/de/common.json',
        translations: { hello: 'Hallo' },
        exists: true,
      },
    ]);
  });

  it('loads recursive locale-dir namespace files', async () => {
    vol.fromJSON({
      '/p/src/i18n/en/auth/login.json': JSON.stringify({ title: 'Login' }),
    });

    const files = await loadLocaleFiles({
      cwd: '/p',
      inputDir: './src/i18n',
      locales: ['en'],
      namespaces: { structure: 'locale-dir' },
    });

    expect(files).toEqual([
      {
        locale: 'en',
        namespace: 'auth/login',
        path: '/p/src/i18n/en/auth/login.json',
        translations: { title: 'Login' },
        exists: true,
      },
    ]);
  });

  it('synthesizes missing locale-dir files for discovered namespaces', async () => {
    vol.fromJSON({
      '/p/src/i18n/en/common.json': JSON.stringify({ hello: 'Hi' }),
    });

    const files = await loadLocaleFiles({
      cwd: '/p',
      inputDir: './src/i18n',
      locales: ['en', 'de'],
      namespaces: { structure: 'locale-dir' },
    });

    expect(files[1]).toEqual({
      locale: 'de',
      namespace: 'common',
      path: '/p/src/i18n/de/common.json',
      translations: {},
      exists: false,
    });
  });

  it('returns an empty array in namespaced mode when no namespaces are discovered', async () => {
    vol.fromJSON({ '/p/src/i18n/.keep': '' });

    await expect(
      loadLocaleFiles({
        cwd: '/p',
        inputDir: './src/i18n',
        locales: ['en', 'de'],
        namespaces: { structure: 'locale-dir' },
      }),
    ).resolves.toEqual([]);
  });

  it('loads locale-prefix namespace files', async () => {
    vol.fromJSON({
      '/p/src/i18n/en.common.json': JSON.stringify({ hello: 'Hi' }),
      '/p/src/i18n/de.common.json': JSON.stringify({ hello: 'Hallo' }),
    });

    const files = await loadLocaleFiles({
      cwd: '/p',
      inputDir: './src/i18n',
      locales: ['en', 'de'],
      namespaces: { structure: 'locale-prefix' },
    });

    expect(files).toEqual([
      {
        locale: 'en',
        namespace: 'common',
        path: '/p/src/i18n/en.common.json',
        translations: { hello: 'Hi' },
        exists: true,
      },
      {
        locale: 'de',
        namespace: 'common',
        path: '/p/src/i18n/de.common.json',
        translations: { hello: 'Hallo' },
        exists: true,
      },
    ]);
  });

  it('matches locale-prefix files using the longest configured locale first', async () => {
    vol.fromJSON({
      '/p/src/i18n/en-GB.common.json': JSON.stringify({ hello: 'Hello' }),
    });

    const files = await loadLocaleFiles({
      cwd: '/p',
      inputDir: './src/i18n',
      locales: ['en', 'en-GB'],
      namespaces: { structure: 'locale-prefix' },
    });

    expect(files).toEqual([
      {
        locale: 'en',
        namespace: 'common',
        path: '/p/src/i18n/en.common.json',
        translations: {},
        exists: false,
      },
      {
        locale: 'en-GB',
        namespace: 'common',
        path: '/p/src/i18n/en-GB.common.json',
        translations: { hello: 'Hello' },
        exists: true,
      },
    ]);
  });

  it('ignores unrelated locale-prefix JSON files', async () => {
    vol.fromJSON({
      '/p/src/i18n/fr.common.json': JSON.stringify({ hello: 'Salut' }),
      '/p/src/i18n/metadata.json': JSON.stringify({ ignored: true }),
      '/p/src/i18n/en.common.json': JSON.stringify({ hello: 'Hi' }),
    });

    const files = await loadLocaleFiles({
      cwd: '/p',
      inputDir: './src/i18n',
      locales: ['en'],
      namespaces: { structure: 'locale-prefix' },
    });

    expect(files).toHaveLength(1);
    expect(files[0]?.namespace).toBe('common');
  });

  it('allows dots in locale-prefix namespace names', async () => {
    vol.fromJSON({
      '/p/src/i18n/en.admin.users.json': JSON.stringify({ title: 'Users' }),
    });

    const files = await loadLocaleFiles({
      cwd: '/p',
      inputDir: './src/i18n',
      locales: ['en'],
      namespaces: { structure: 'locale-prefix' },
    });

    expect(files[0]).toMatchObject({ locale: 'en', namespace: 'admin.users' });
  });

  it('ignores files that produce an empty namespace in locale-prefix mode', async () => {
    vol.fromJSON({
      '/p/src/i18n/en.json': JSON.stringify({ plain: 'ignored' }),
      '/p/src/i18n/en..json': JSON.stringify({ alsoIgnored: 'x' }),
      '/p/src/i18n/en.common.json': JSON.stringify({ hi: 'Hi' }),
    });

    const files = await loadLocaleFiles({
      cwd: '/p',
      inputDir: './src/i18n',
      locales: ['en'],
      namespaces: { structure: 'locale-prefix' },
    });

    // Only the real namespaced file is discovered; en.json / en..json are skipped.
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ locale: 'en', namespace: 'common' });
  });

  it('includes the namespaced logical path in invalid JSON errors', async () => {
    vol.fromJSON({ '/p/src/i18n/de/common.json': '{ not json' });

    await expect(
      loadLocaleFiles({
        cwd: '/p',
        inputDir: './src/i18n',
        locales: ['de'],
        namespaces: { structure: 'locale-dir' },
      }),
    ).rejects.toThrow(/Failed to parse de\/common\.json/);
  });
});

describe('resolveLocaleFilePath', () => {
  it('resolves canonical paths for all layouts', () => {
    expect(
      resolveLocaleFilePath({ cwd: '/p', inputDir: './src/i18n', locale: 'en', namespace: null }),
    ).toBe('/p/src/i18n/en.json');
    expect(
      resolveLocaleFilePath({
        cwd: '/p',
        inputDir: './src/i18n',
        locale: 'en',
        namespace: 'auth/login',
        namespaces: { structure: 'locale-dir' },
      }),
    ).toBe('/p/src/i18n/en/auth/login.json');
    expect(
      resolveLocaleFilePath({
        cwd: '/p',
        inputDir: './src/i18n',
        locale: 'en',
        namespace: 'common',
        namespaces: { structure: 'locale-prefix' },
      }),
    ).toBe('/p/src/i18n/en.common.json');
  });

  it.each(['../x', '/x', '.', '..', 'a/../b', 'a/.', 'a\\b'])(
    'rejects invalid namespace %s',
    (namespace) => {
      expect(() =>
        resolveLocaleFilePath({
          cwd: '/p',
          inputDir: './src/i18n',
          locale: 'en',
          namespace,
          namespaces: { structure: 'locale-dir' },
        }),
      ).toThrow(/namespace/i);
    },
  );

  it('rejects slashes in locale-prefix namespaces', () => {
    expect(() =>
      resolveLocaleFilePath({
        cwd: '/p',
        inputDir: './src/i18n',
        locale: 'en',
        namespace: 'auth/login',
        namespaces: { structure: 'locale-prefix' },
      }),
    ).toThrow(/locale-prefix/);
  });

  it('rejects impossible namespace mode combinations', () => {
    expect(() =>
      resolveLocaleFilePath({
        cwd: '/p',
        inputDir: './src/i18n',
        locale: 'en',
        namespace: 'common',
      }),
    ).toThrow(/single-file mode/);
    expect(() =>
      resolveLocaleFilePath({
        cwd: '/p',
        inputDir: './src/i18n',
        locale: 'en',
        namespace: null,
        namespaces: { structure: 'locale-dir' },
      }),
    ).toThrow(/requires a non-null namespace/);
  });
});

describe('indexLocaleFiles', () => {
  it('groups by locale and namespace while preserving file order and sorting namespaces', () => {
    const files: LoadedLocaleFile[] = [
      { locale: 'en', namespace: 'z', path: '/p/en/z.json', translations: {}, exists: true },
      { locale: 'en', namespace: 'a', path: '/p/en/a.json', translations: {}, exists: true },
      { locale: 'de', namespace: 'a', path: '/p/de/a.json', translations: {}, exists: false },
    ];

    const index = indexLocaleFiles(files);

    expect(index.files).toBe(files);
    expect(index.namespaces).toEqual(['a', 'z']);
    expect(index.byLocale.en?.get('z')).toBe(files[0]);
    expect(index.byLocale.de?.get('a')).toBe(files[2]);
  });

  it('uses null as the key for single-file locale files', () => {
    const files: LoadedLocaleFile[] = [
      { locale: 'en', namespace: null, path: '/p/en.json', translations: {}, exists: true },
    ];

    const index = indexLocaleFiles(files);

    expect(index.namespaces).toEqual([]);
    expect(index.byLocale.en?.get(null)).toBe(files[0]);
  });
});

describe('readJson', () => {
  beforeEach(() => vol.reset());
  afterEach(() => vol.reset());

  it('reads and parses a JSON file', async () => {
    vol.fromJSON({ '/data/config.json': '{"key":"value"}' });
    const result = await readJson<{ key: string }>('/data/config.json');
    expect(result).toEqual({ key: 'value' });
  });

  it('throws when the file does not exist', async () => {
    await expect(readJson('/no/such/file.json')).rejects.toThrow();
  });
});

describe('writeJson', () => {
  beforeEach(() => vol.reset());
  afterEach(() => vol.reset());

  it('writes a JSON file with 2-space indentation and trailing newline', async () => {
    vol.fromJSON({ '/out/.keep': '' });
    await writeJson('/out/result.json', { a: 1 });
    const { readFile } = await import('node:fs/promises');
    const content = await readFile('/out/result.json', 'utf-8');
    expect(content).toBe('{\n  "a": 1\n}\n');
  });

  it('creates parent directories automatically', async () => {
    await writeJson('/deep/nested/dir/result.json', { x: 2 });
    const { readFile } = await import('node:fs/promises');
    const content = await readFile('/deep/nested/dir/result.json', 'utf-8');
    expect(JSON.parse(content)).toEqual({ x: 2 });
  });
});

describe('pathExists', () => {
  beforeEach(() => vol.reset());
  afterEach(() => vol.reset());

  it('returns true when the path exists', async () => {
    vol.fromJSON({ '/exists/file.txt': 'data' });
    await expect(pathExists('/exists/file.txt')).resolves.toBe(true);
  });

  it('returns false when the path does not exist', async () => {
    await expect(pathExists('/no/such/path.txt')).resolves.toBe(false);
  });
});
