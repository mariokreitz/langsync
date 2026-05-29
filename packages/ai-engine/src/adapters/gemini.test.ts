import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiAdapter } from './gemini.js';

function geminiResponse(text: string, init: Partial<Response> = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text }] } }] }),
  } as Response;
}

interface GeminiBody {
  systemInstruction: { parts: { text: string }[] };
  contents: { parts: { text: string }[] }[];
}

describe('GeminiAdapter', () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });
  afterEach(() => vi.clearAllMocks());

  it('throws when no API key is provided', () => {
    expect(() => new GeminiAdapter()).toThrow(/API key missing/i);
  });

  it('reads the API key from the environment', () => {
    process.env.GEMINI_API_KEY = 'env-key';
    expect(() => new GeminiAdapter({ fetchImpl: vi.fn() })).not.toThrow();
  });

  it('targets the default model endpoint with the key as a query param', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(geminiResponse(' Hallo '));
    const adapter = new GeminiAdapter({ apiKey: 'k', fetchImpl });

    const result = await adapter.translate({
      text: 'Hello',
      sourceLocale: 'en',
      targetLocale: 'de',
    });

    expect(result).toBe('Hallo');
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=k',
    );
    const body = JSON.parse(init!.body as string) as GeminiBody;
    expect(body.systemInstruction.parts[0]!.text).toContain('from en to de');
    expect(body.contents[0]!.parts[0]!.text).toBe('Hello');
  });

  it('honors a model override in the endpoint', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(geminiResponse('Hallo'));
    const adapter = new GeminiAdapter({ apiKey: 'k', model: 'gemini-1.5-pro', fetchImpl });

    await adapter.translate({ text: 'Hi', sourceLocale: 'en', targetLocale: 'de' });

    expect(fetchImpl.mock.calls[0]![0]).toContain('models/gemini-1.5-pro:generateContent');
  });

  it('throws on a non-ok response', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(geminiResponse('', { ok: false, status: 403, statusText: 'Forbidden' }));
    const adapter = new GeminiAdapter({ apiKey: 'k', fetchImpl });

    await expect(
      adapter.translate({ text: 'Hi', sourceLocale: 'en', targetLocale: 'de' }),
    ).rejects.toThrow(/403/);
  });

  it('throws when the response has no candidate text', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ candidates: [] }),
    } as Response);
    const adapter = new GeminiAdapter({ apiKey: 'k', fetchImpl });

    await expect(
      adapter.translate({ text: 'Hi', sourceLocale: 'en', targetLocale: 'de' }),
    ).rejects.toThrow(/empty translation/i);
  });
});
