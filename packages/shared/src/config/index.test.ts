import { describe, expect, it } from 'vitest';
import { LangSyncConfigSchema, defineConfig, type LangSyncConfigInput } from './index.js';

describe('LangSyncConfigSchema', () => {
  it('accepts the minimum required fields (input, locales)', () => {
    const parsed = LangSyncConfigSchema.parse({
      input: './src/i18n',
      locales: ['en', 'de'],
    });

    expect(parsed.input).toBe('./src/i18n');
    expect(parsed.locales).toEqual(['en', 'de']);
  });

  it('applies output default when omitted', () => {
    const parsed = LangSyncConfigSchema.parse({
      input: './src/i18n',
      locales: ['en'],
    });

    expect(parsed.output).toBe('./translations');
  });

  it('preserves an explicit output value', () => {
    const parsed = LangSyncConfigSchema.parse({
      input: './src/i18n',
      output: './my-output',
      locales: ['en'],
    });

    expect(parsed.output).toBe('./my-output');
  });

  it('accepts framework none for explicit opt-out', () => {
    const parsed = LangSyncConfigSchema.parse({
      input: './src/i18n',
      locales: ['en', 'de'],
      framework: 'none',
    });

    expect(parsed.framework).toBe('none');
  });

  it('keeps framework optional when omitted', () => {
    const parsed = LangSyncConfigSchema.parse({
      input: './src/i18n',
      locales: ['en'],
    });

    expect(parsed.framework).toBeUndefined();
  });

  it('rejects an empty locales array', () => {
    expect(() => LangSyncConfigSchema.parse({ input: './src/i18n', locales: [] })).toThrow();
  });

  it('rejects an unknown framework value', () => {
    expect(() =>
      LangSyncConfigSchema.parse({ input: './src/i18n', locales: ['en'], framework: 'vue-i18n' }),
    ).toThrow();
  });
});

describe('defineConfig', () => {
  it('accepts config without output field (output is optional)', () => {
    const config: LangSyncConfigInput = {
      input: './src/i18n',
      locales: ['en', 'de'],
    };
    const result = defineConfig(config);
    // defineConfig is a pass-through; defaults are applied during loadConfig
    expect(result.input).toBe('./src/i18n');
    expect(result.output).toBeUndefined();
  });

  it('preserves all provided fields', () => {
    const result = defineConfig({
      input: './i18n',
      output: './out',
      locales: ['en'],
      defaultLocale: 'en',
      framework: 'i18next',
    });

    expect(result).toMatchObject({
      input: './i18n',
      output: './out',
      locales: ['en'],
      defaultLocale: 'en',
      framework: 'i18next',
    });
  });
});
