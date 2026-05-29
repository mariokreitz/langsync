import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeepLAdapter } from './deepl.js';

function deeplResponse(translation: string, init: Partial<Response> = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: () => Promise.resolve({ translations: [{ text: translation }] }),
  } as Response;
}

interface DeepLBody {
  text: string[];
  source_lang: string;
  target_lang: string;
}

describe('DeepLAdapter', () => {
  beforeEach(() => {
    delete process.env.DEEPL_API_KEY;
  });
  afterEach(() => vi.clearAllMocks());

  it('throws when no API key is provided', () => {
    expect(() => new DeepLAdapter()).toThrow(/API key missing/i);
  });

  it('reads the API key from the environment', () => {
    process.env.DEEPL_API_KEY = 'env-key';
    expect(() => new DeepLAdapter({ fetchImpl: vi.fn() })).not.toThrow();
  });

  it('uppercases locales and returns the translation', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(deeplResponse('Hallo'));
    const adapter = new DeepLAdapter({ apiKey: 'k:fx', fetchImpl });

    const result = await adapter.translate({
      text: 'Hello',
      sourceLocale: 'en',
      targetLocale: 'de',
    });

    expect(result).toBe('Hallo');
    const init = fetchImpl.mock.calls[0]![1]!;
    const body = JSON.parse(init.body as string) as DeepLBody;
    expect(body.text).toEqual(['Hello']);
    expect(body.source_lang).toBe('EN');
    expect(body.target_lang).toBe('DE');
    expect(init.headers).toMatchObject({ authorization: 'DeepL-Auth-Key k:fx' });
  });

  it('routes free-tier keys (:fx suffix) to the free endpoint', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(deeplResponse('Hallo'));
    const adapter = new DeepLAdapter({ apiKey: 'abc:fx', fetchImpl });

    await adapter.translate({ text: 'Hello', sourceLocale: 'en', targetLocale: 'de' });

    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api-free.deepl.com/v2/translate');
  });

  it('routes pro keys to the pro endpoint', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(deeplResponse('Hallo'));
    const adapter = new DeepLAdapter({ apiKey: 'pro-key', fetchImpl });

    await adapter.translate({ text: 'Hello', sourceLocale: 'en', targetLocale: 'de' });

    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.deepl.com/v2/translate');
  });

  it('honors the explicit useFreeTier override', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(deeplResponse('Hallo'));
    const adapter = new DeepLAdapter({ apiKey: 'pro-key', useFreeTier: true, fetchImpl });

    await adapter.translate({ text: 'Hello', sourceLocale: 'en', targetLocale: 'de' });

    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api-free.deepl.com/v2/translate');
  });

  it('strips region subtags from locale codes (en-US -> EN)', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(deeplResponse('Hallo'));
    const adapter = new DeepLAdapter({ apiKey: 'k:fx', fetchImpl });

    await adapter.translate({ text: 'Hello', sourceLocale: 'en-US', targetLocale: 'de-DE' });

    const body = JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string) as DeepLBody;
    expect(body.source_lang).toBe('EN');
    expect(body.target_lang).toBe('DE');
  });

  it('throws on a non-ok response', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(deeplResponse('', { ok: false, status: 456, statusText: 'Quota' }));
    const adapter = new DeepLAdapter({ apiKey: 'k:fx', fetchImpl });

    await expect(
      adapter.translate({ text: 'Hi', sourceLocale: 'en', targetLocale: 'de' }),
    ).rejects.toThrow(/456/);
  });

  it('throws when the response has no translation', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ translations: [] }),
    } as Response);
    const adapter = new DeepLAdapter({ apiKey: 'k:fx', fetchImpl });

    await expect(
      adapter.translate({ text: 'Hi', sourceLocale: 'en', targetLocale: 'de' }),
    ).rejects.toThrow(/empty translation/i);
  });
});
