import { describe, expect, it } from 'vitest';
import { validateLocales } from './index.js';
import { type LocaleFile } from '@langsync/shared/types';

const en: LocaleFile = {
  locale: 'en',
  path: '/i18n/en.json',
  translations: { greeting: { hello: 'Hello', bye: 'Bye' }, app: { name: 'LangSync' } },
};

describe('validateLocales', () => {
  it('reports missing keys in non-reference locales', () => {
    const de: LocaleFile = {
      locale: 'de',
      path: '/i18n/de.json',
      translations: { greeting: { hello: 'Hallo' }, app: { name: 'LangSync' } },
    };
    const issues = validateLocales([en, de], 'en');
    expect(issues).toContainEqual({ type: 'missing', locale: 'de', key: 'greeting.bye' });
  });

  it('reports extra keys in non-reference locales', () => {
    const de: LocaleFile = {
      locale: 'de',
      path: '/i18n/de.json',
      translations: {
        greeting: { hello: 'Hallo', bye: 'Tschuess', extra: 'X' },
        app: { name: 'LangSync' },
      },
    };
    const issues = validateLocales([en, de], 'en');
    expect(issues).toContainEqual({ type: 'extra', locale: 'de', key: 'greeting.extra' });
  });

  it('reports empty values in any locale', () => {
    const de: LocaleFile = {
      locale: 'de',
      path: '/i18n/de.json',
      translations: { greeting: { hello: '', bye: 'Tschuess' }, app: { name: 'LangSync' } },
    };
    const issues = validateLocales([en, de], 'en');
    expect(issues).toContainEqual({ type: 'empty', locale: 'de', key: 'greeting.hello' });
  });

  it('does not report missing/extra against the reference locale itself', () => {
    const issues = validateLocales([en], 'en');
    expect(issues.filter((i) => i.type !== 'empty')).toEqual([]);
  });

  it('returns [] when reference locale is not present', () => {
    const de: LocaleFile = {
      locale: 'de',
      path: '/i18n/de.json',
      translations: { greeting: { hello: 'Hallo' } },
    };
    expect(validateLocales([de], 'en')).toEqual([]);
  });
});
