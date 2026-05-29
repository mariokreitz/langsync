import { describe, expect, it } from 'vitest';
import { LangSyncConfigSchema, defineConfig } from './index.js';

describe('LangSyncConfigSchema', () => {
  it('accepts framework none for explicit opt-out', () => {
    const parsed = LangSyncConfigSchema.parse({
      input: './src/i18n',
      output: './translations',
      locales: ['en', 'de'],
      framework: 'none',
    });

    expect(parsed.framework).toBe('none');
  });

  it('keeps framework optional when omitted', () => {
    const config = defineConfig({
      input: './src/i18n',
      output: './translations',
      locales: ['en', 'de'],
    });

    expect(config.framework).toBeUndefined();
  });
});
