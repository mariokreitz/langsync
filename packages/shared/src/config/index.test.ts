import { describe, expect, it, vi } from 'vitest';
import {
  LangSyncConfigSchema,
  defineConfig,
  loadConfig,
  type LangSyncConfigInput,
} from './index.js';

vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(() => ({
    search: vi.fn().mockResolvedValue(null),
  })),
}));

vi.mock('cosmiconfig-typescript-loader', () => ({
  TypeScriptLoader: vi.fn(() => ({})),
}));

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

  it('accepts config with no namespaces block', () => {
    const parsed = LangSyncConfigSchema.parse({
      input: './src/i18n',
      locales: ['en'],
    });

    expect(parsed.namespaces).toBeUndefined();
  });

  it('accepts locale-dir namespace structure', () => {
    const parsed = LangSyncConfigSchema.parse({
      input: './src/i18n',
      locales: ['en'],
      namespaces: { structure: 'locale-dir' },
    });

    expect(parsed.namespaces).toEqual({ structure: 'locale-dir' });
  });

  it('accepts locale-prefix namespace structure', () => {
    const parsed = LangSyncConfigSchema.parse({
      input: './src/i18n',
      locales: ['en'],
      namespaces: { structure: 'locale-prefix' },
    });

    expect(parsed.namespaces).toEqual({ structure: 'locale-prefix' });
  });

  it('rejects unknown namespace structure', () => {
    expect(() =>
      LangSyncConfigSchema.parse({
        input: './src/i18n',
        locales: ['en'],
        namespaces: { structure: 'flat' },
      }),
    ).toThrow();
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

  it('requires at least one locale', () => {
    expect(() =>
      LangSyncConfigSchema.parse({
        input: './src/i18n',
        output: './out',
        locales: [],
      }),
    ).toThrow();
  });

  it('requires the input field', () => {
    expect(() => LangSyncConfigSchema.parse({ output: './out', locales: ['en'] })).toThrow();
  });

  // output is optional — it defaults to './translations' (added in config-ux-polish)

  it('applies ai.provider default of openai', () => {
    const parsed = LangSyncConfigSchema.parse({
      input: './src',
      output: './out',
      locales: ['en'],
      ai: {},
    });
    expect(parsed.ai?.provider).toBe('openai');
  });

  it('applies excel defaults for file and sheetName', () => {
    const parsed = LangSyncConfigSchema.parse({
      input: './src',
      output: './out',
      locales: ['en'],
      excel: {},
    });
    expect(parsed.excel?.file).toBe('translations.xlsx');
    expect(parsed.excel?.sheetName).toBe('Translations');
  });

  it('passes defaultLocale through', () => {
    const parsed = LangSyncConfigSchema.parse({
      input: './src',
      output: './out',
      locales: ['en', 'de'],
      defaultLocale: 'en',
    });
    expect(parsed.defaultLocale).toBe('en');
  });
});

describe('defineConfig', () => {
  it('returns the config object unchanged', () => {
    const cfg = defineConfig({
      input: './src/i18n',
      output: './translations',
      locales: ['en'],
    });
    expect(cfg.input).toBe('./src/i18n');
    expect(cfg.output).toBe('./translations');
  });
});

describe('loadConfig', () => {
  it('returns null when no config file is found', async () => {
    const { cosmiconfig } = await import('cosmiconfig');
    vi.mocked(cosmiconfig).mockReturnValue({
      search: vi.fn().mockResolvedValue(null),
    } as never);

    const result = await loadConfig('/tmp/no-config');
    expect(result).toBeNull();
  });

  it('returns parsed config and filepath when a config is found', async () => {
    const { cosmiconfig } = await import('cosmiconfig');
    vi.mocked(cosmiconfig).mockReturnValue({
      search: vi.fn().mockResolvedValue({
        config: { input: './src', output: './out', locales: ['en', 'de'] },
        filepath: '/project/langsync.config.ts',
      }),
    } as never);

    const result = await loadConfig('/project');
    expect(result).not.toBeNull();
    expect(result!.filepath).toBe('/project/langsync.config.ts');
    expect(result!.config.locales).toEqual(['en', 'de']);
  });
});
