import { describe, expect, it, vi } from 'vitest';
import { fillEmptyTranslations } from './translate.js';
import { type TranslateRequest, type TranslationAdapter } from './types.js';

function fakeAdapter(map: Record<string, string> = {}): {
  adapter: TranslationAdapter;
  translate: ReturnType<typeof vi.fn>;
} {
  const translate = vi.fn((req: TranslateRequest) =>
    Promise.resolve(map[req.text] ?? `[${req.text}]`),
  );
  return { adapter: { provider: 'openai', translate }, translate };
}

describe('fillEmptyTranslations', () => {
  it('translates only empty/missing target keys', async () => {
    const { adapter, translate } = fakeAdapter({ Hello: 'Hallo', Bye: 'Tschüss' });
    const result = await fillEmptyTranslations({
      reference: { greet: 'Hello', farewell: 'Bye' },
      target: { greet: 'Servus', farewell: '' },
      sourceLocale: 'en',
      targetLocale: 'de',
      adapter,
    });

    expect(result.tree).toEqual({ greet: 'Servus', farewell: 'Tschüss' });
    expect(result.translatedKeys).toEqual(['farewell']);
    expect(translate).toHaveBeenCalledTimes(1);
  });

  it('handles deeply nested trees', async () => {
    const { adapter } = fakeAdapter({ Save: 'Speichern' });
    const result = await fillEmptyTranslations({
      reference: { menu: { file: { save: 'Save' } } },
      target: { menu: { file: { save: '' } } },
      sourceLocale: 'en',
      targetLocale: 'de',
      adapter,
    });

    expect(result.tree).toEqual({ menu: { file: { save: 'Speichern' } } });
    expect(result.translatedKeys).toEqual(['menu.file.save']);
  });

  it('skips keys whose reference value is empty', async () => {
    const { adapter, translate } = fakeAdapter();
    const result = await fillEmptyTranslations({
      reference: { a: '', b: 'B' },
      target: { a: '', b: '' },
      sourceLocale: 'en',
      targetLocale: 'de',
      adapter,
    });

    expect(result.translatedKeys).toEqual(['b']);
    expect(translate).toHaveBeenCalledTimes(1);
  });

  it('returns no translations when everything is already filled', async () => {
    const { adapter, translate } = fakeAdapter();
    const result = await fillEmptyTranslations({
      reference: { a: 'A' },
      target: { a: 'AA' },
      sourceLocale: 'en',
      targetLocale: 'de',
      adapter,
    });

    expect(result.tree).toEqual({ a: 'AA' });
    expect(result.translatedKeys).toEqual([]);
    expect(translate).not.toHaveBeenCalled();
  });
});
