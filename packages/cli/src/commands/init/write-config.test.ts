import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { vol } from 'memfs';
import { writeConfig } from './write-config.js';
import { type InitAnswers } from './prompt.js';

vi.mock('node:fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

const ANSWERS: InitAnswers = {
  input: './src/i18n',
  output: './translations',
  locales: ['en', 'de'],
  defaultLocale: 'en',
  framework: 'i18next',
};

describe('writeConfig', () => {
  beforeEach(() => {
    vol.reset();
    vol.fromJSON({ '/project/package.json': '{}' });
  });

  afterEach(() => {
    vol.reset();
  });

  it('writes a typed TS config and single-file locale stubs by default', async () => {
    const result = await writeConfig({
      cwd: '/project',
      answers: ANSWERS,
      format: 'ts',
      force: false,
    });

    expect(result.configPath).toBe('/project/langsync.config.ts');
    expect(result.createdLocaleFiles).toEqual([
      '/project/src/i18n/en.json',
      '/project/src/i18n/de.json',
    ]);

    const content = vol.readFileSync('/project/langsync.config.ts', 'utf-8') as string;
    expect(content).toContain("import { defineConfig } from '@mariokreitz/langsync';");
    expect(content).toContain("locales: ['en', 'de']");
    expect(content).toContain("framework: 'i18next'");
    expect(content).not.toContain('namespaces:');
    expect(vol.readFileSync('/project/src/i18n/en.json', 'utf-8')).toBe('{}\n');
  });

  it('writes a JSON config without namespaces by default', async () => {
    const result = await writeConfig({
      cwd: '/project',
      answers: ANSWERS,
      format: 'json',
      force: false,
    });

    expect(result.configPath).toBe('/project/langsync.config.json');
    const content = vol.readFileSync('/project/langsync.config.json', 'utf-8') as string;
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      input: './src/i18n',
      output: './translations',
      locales: ['en', 'de'],
      defaultLocale: 'en',
      framework: 'i18next',
    });
    expect(parsed).not.toHaveProperty('namespaces');
  });

  it('emits locale-dir namespaces in TS config and scaffolds nested namespace files', async () => {
    const result = await writeConfig({
      cwd: '/project',
      answers: {
        ...ANSWERS,
        namespaces: { structure: 'locale-dir' },
        initialNamespaces: ['common', 'auth/login'],
      },
      format: 'ts',
      force: false,
    });

    expect(result.createdLocaleFiles).toEqual([
      '/project/src/i18n/en/common.json',
      '/project/src/i18n/en/auth/login.json',
      '/project/src/i18n/de/common.json',
      '/project/src/i18n/de/auth/login.json',
    ]);
    const content = vol.readFileSync('/project/langsync.config.ts', 'utf-8') as string;
    expect(content).toContain("namespaces: { structure: 'locale-dir' }");
    expect(vol.readFileSync('/project/src/i18n/en/auth/login.json', 'utf-8')).toBe('{}\n');
  });

  it('emits locale-prefix namespaces in JSON config and scaffolds flat namespace files', async () => {
    const result = await writeConfig({
      cwd: '/project',
      answers: {
        ...ANSWERS,
        namespaces: { structure: 'locale-prefix' },
        initialNamespaces: ['common', 'admin.users'],
      },
      format: 'json',
      force: false,
    });

    expect(result.createdLocaleFiles).toEqual([
      '/project/src/i18n/en.common.json',
      '/project/src/i18n/en.admin.users.json',
      '/project/src/i18n/de.common.json',
      '/project/src/i18n/de.admin.users.json',
    ]);
    const content = vol.readFileSync('/project/langsync.config.json', 'utf-8') as string;
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(parsed).toMatchObject({ namespaces: { structure: 'locale-prefix' } });
    expect(vol.readFileSync('/project/src/i18n/de.admin.users.json', 'utf-8')).toBe('{}\n');
  });

  it('defaults namespaced scaffolding to common when initial namespaces are omitted', async () => {
    const result = await writeConfig({
      cwd: '/project',
      answers: { ...ANSWERS, namespaces: { structure: 'locale-dir' } },
      format: 'ts',
      force: false,
    });

    expect(result.createdLocaleFiles).toEqual([
      '/project/src/i18n/en/common.json',
      '/project/src/i18n/de/common.json',
    ]);
  });

  it('omits the framework field when "none"', async () => {
    await writeConfig({
      cwd: '/project',
      answers: { ...ANSWERS, framework: 'none' },
      format: 'ts',
      force: false,
    });
    const content = vol.readFileSync('/project/langsync.config.ts', 'utf-8') as string;
    expect(content).not.toContain('framework:');
  });

  it('refuses to overwrite an existing config unless force=true', async () => {
    vol.fromJSON({ '/project/langsync.config.ts': '// existing' }, '/');

    await expect(
      writeConfig({ cwd: '/project', answers: ANSWERS, format: 'ts', force: false }),
    ).rejects.toThrow(/already exists/);

    await expect(
      writeConfig({ cwd: '/project', answers: ANSWERS, format: 'ts', force: true }),
    ).resolves.toBeDefined();
  });

  it('does not overwrite existing locale stub files', async () => {
    vol.fromJSON({ '/project/src/i18n/en.json': '{"hello":"hi"}' }, '/');

    const result = await writeConfig({
      cwd: '/project',
      answers: ANSWERS,
      format: 'ts',
      force: false,
    });

    expect(result.createdLocaleFiles).toEqual(['/project/src/i18n/de.json']);
    expect(vol.readFileSync('/project/src/i18n/en.json', 'utf-8')).toBe('{"hello":"hi"}');
  });
});
