import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAIAdapter } from './openai.js';

function jsonResponse(body: unknown, init: Partial<Response> = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: () => Promise.resolve(body),
  } as Response;
}

interface ChatBody {
  messages: { role: string; content: string }[];
}

describe('OpenAIAdapter', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });
  afterEach(() => vi.clearAllMocks());

  it('throws when no API key is provided', () => {
    expect(() => new OpenAIAdapter()).toThrow(/API key missing/i);
  });

  it('reads the API key from the environment', () => {
    process.env.OPENAI_API_KEY = 'env-key';
    expect(() => new OpenAIAdapter({ fetchImpl: vi.fn() })).not.toThrow();
  });

  it('sends the source/target locales and returns the translation', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ choices: [{ message: { content: ' Hallo ' } }] }));
    const adapter = new OpenAIAdapter({ apiKey: 'k', fetchImpl });

    const result = await adapter.translate({
      text: 'Hello',
      sourceLocale: 'en',
      targetLocale: 'de',
    });

    expect(result).toBe('Hallo');
    const init = fetchImpl.mock.calls[0]![1]!;
    const body = JSON.parse(init.body as string) as ChatBody;
    expect(body.messages[0]!.content).toContain('from en to de');
    expect(body.messages[1]!.content).toBe('Hello');
    expect(init.headers).toMatchObject({ authorization: 'Bearer k' });
  });

  it('throws on a non-ok response', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({}, { ok: false, status: 429, statusText: 'Too Many' }));
    const adapter = new OpenAIAdapter({ apiKey: 'k', fetchImpl });

    await expect(
      adapter.translate({ text: 'Hi', sourceLocale: 'en', targetLocale: 'de' }),
    ).rejects.toThrow(/429/);
  });

  it('throws when the response has no content', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ choices: [] }));
    const adapter = new OpenAIAdapter({ apiKey: 'k', fetchImpl });

    await expect(
      adapter.translate({ text: 'Hi', sourceLocale: 'en', targetLocale: 'de' }),
    ).rejects.toThrow(/empty translation/i);
  });
});
