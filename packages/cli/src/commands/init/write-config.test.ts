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

  it('writes a typed TS config and locale stubs', async () => {
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
    expect(content).toContain("import { defineConfig } from 'langsync';");
    expect(content).toContain("locales: ['en', 'de']");
    expect(content).toContain("framework: 'i18next'");
    expect(vol.readFileSync('/project/src/i18n/en.json', 'utf-8')).toBe('{}\n');
  });

  it('writes a JSON config when format=json', async () => {
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
