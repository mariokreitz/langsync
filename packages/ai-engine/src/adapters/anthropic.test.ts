import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicAdapter } from './anthropic.js';

function anthropicResponse(text: string, init: Partial<Response> = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: () => Promise.resolve({ content: [{ type: 'text', text }] }),
  } as Response;
}

interface MessagesBody {
  model: string;
  system: string;
  messages: { role: string; content: string }[];
}

describe('AnthropicAdapter', () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => vi.clearAllMocks());

  it('throws when no API key is provided', () => {
    expect(() => new AnthropicAdapter()).toThrow(/API key missing/i);
  });

  it('reads the API key from the environment', () => {
    process.env.ANTHROPIC_API_KEY = 'env-key';
    expect(() => new AnthropicAdapter({ fetchImpl: vi.fn() })).not.toThrow();
  });

  it('sends locales + auth headers and returns the translation', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(anthropicResponse(' Hallo '));
    const adapter = new AnthropicAdapter({ apiKey: 'k', fetchImpl });

    const result = await adapter.translate({
      text: 'Hello',
      sourceLocale: 'en',
      targetLocale: 'de',
    });

    expect(result).toBe('Hallo');
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const body = JSON.parse(init!.body as string) as MessagesBody;
    expect(body.system).toContain('from en to de');
    expect(body.messages[0]!.content).toBe('Hello');
    expect(init!.headers).toMatchObject({
      'x-api-key': 'k',
      'anthropic-version': '2023-06-01',
    });
  });

  it('uses the default model and honors an override', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(anthropicResponse('Hallo'));

    const def = new AnthropicAdapter({ apiKey: 'k', fetchImpl });
    await def.translate({ text: 'Hi', sourceLocale: 'en', targetLocale: 'de' });
    let body = JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string) as MessagesBody;
    expect(body.model).toBe('claude-3-5-haiku-latest');

    const custom = new AnthropicAdapter({ apiKey: 'k', model: 'claude-foo', fetchImpl });
    await custom.translate({ text: 'Hi', sourceLocale: 'en', targetLocale: 'de' });
    body = JSON.parse(fetchImpl.mock.calls[1]![1]!.body as string) as MessagesBody;
    expect(body.model).toBe('claude-foo');
  });

  it('throws on a non-ok response', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        anthropicResponse('', { ok: false, status: 529, statusText: 'Overloaded' }),
      );
    const adapter = new AnthropicAdapter({ apiKey: 'k', fetchImpl });

    await expect(
      adapter.translate({ text: 'Hi', sourceLocale: 'en', targetLocale: 'de' }),
    ).rejects.toThrow(/529/);
  });

  it('throws when the response has no text content', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ content: [] }),
    } as Response);
    const adapter = new AnthropicAdapter({ apiKey: 'k', fetchImpl });

    await expect(
      adapter.translate({ text: 'Hi', sourceLocale: 'en', targetLocale: 'de' }),
    ).rejects.toThrow(/empty translation/i);
  });

  it('falls back to a block without an explicit type but with text', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ content: [{ text: 'Hallo' }] }),
    } as Response);
    const adapter = new AnthropicAdapter({ apiKey: 'k', fetchImpl });

    await expect(
      adapter.translate({ text: 'Hello', sourceLocale: 'en', targetLocale: 'de' }),
    ).resolves.toBe('Hallo');
  });
});
