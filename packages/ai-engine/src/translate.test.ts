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
    expect(result.skippedKeys).toEqual([]);
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
    expect(result.skippedKeys).toEqual([]);
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
    expect(result.skippedKeys).toEqual([]);
    expect(translate).not.toHaveBeenCalled();
  });

  it('respects maxKeys: stops after the cap and records skippedKeys', async () => {
    const { adapter, translate } = fakeAdapter();
    const result = await fillEmptyTranslations({
      reference: { a: 'A', b: 'B', c: 'C' },
      target: { a: '', b: '', c: '' },
      sourceLocale: 'en',
      targetLocale: 'de',
      adapter,
      maxKeys: 2,
    });

    expect(result.translatedKeys).toHaveLength(2);
    expect(result.skippedKeys).toHaveLength(1);
    expect(translate).toHaveBeenCalledTimes(2);
  });

  it('translates all keys when maxKeys equals the total empty count', async () => {
    const { adapter, translate } = fakeAdapter();
    const result = await fillEmptyTranslations({
      reference: { a: 'A', b: 'B' },
      target: { a: '', b: '' },
      sourceLocale: 'en',
      targetLocale: 'de',
      adapter,
      maxKeys: 2,
    });

    expect(result.translatedKeys).toHaveLength(2);
    expect(result.skippedKeys).toHaveLength(0);
    expect(translate).toHaveBeenCalledTimes(2);
  });

  it('translates all keys when maxKeys is larger than available empty keys', async () => {
    const { adapter, translate } = fakeAdapter();
    const result = await fillEmptyTranslations({
      reference: { a: 'A' },
      target: { a: '' },
      sourceLocale: 'en',
      targetLocale: 'de',
      adapter,
      maxKeys: 100,
    });

    expect(result.translatedKeys).toHaveLength(1);
    expect(result.skippedKeys).toHaveLength(0);
    expect(translate).toHaveBeenCalledTimes(1);
  });
});
