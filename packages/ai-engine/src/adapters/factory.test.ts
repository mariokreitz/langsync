import { afterEach, describe, expect, it, vi } from 'vitest';
import { availableProviders, createAdapter } from './index.js';

describe('createAdapter', () => {
  afterEach(() => {
    delete process.env.LANGSYNC_AI_EXPERIMENTAL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPL_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    vi.clearAllMocks();
  });

  it('creates the OpenAI adapter', () => {
    const adapter = createAdapter({ provider: 'openai', apiKey: 'k' });
    expect(adapter.provider).toBe('openai');
  });

  it('creates the DeepL adapter (now released)', () => {
    const adapter = createAdapter({ provider: 'deepl', apiKey: 'k:fx' });
    expect(adapter.provider).toBe('deepl');
  });

  it('lists OpenAI and DeepL as released providers by default', () => {
    expect(availableProviders()).toEqual(['openai', 'deepl']);
  });

  it('throws a helpful error for not-yet-released providers (Anthropic, Gemini)', () => {
    expect(() => createAdapter({ provider: 'anthropic', apiKey: 'k' })).toThrow(
      /not yet available/i,
    );
    expect(() => createAdapter({ provider: 'gemini', apiKey: 'k' })).toThrow(/not yet available/i);
  });

  it('exposes all providers when the experimental flag is set', () => {
    process.env.LANGSYNC_AI_EXPERIMENTAL = '1';
    expect(availableProviders()).toEqual(['openai', 'deepl', 'anthropic', 'gemini']);
  });

  it('constructs each experimental adapter when the flag is set', () => {
    process.env.LANGSYNC_AI_EXPERIMENTAL = '1';
    expect(createAdapter({ provider: 'anthropic', apiKey: 'k' }).provider).toBe('anthropic');
    expect(createAdapter({ provider: 'gemini', apiKey: 'k' }).provider).toBe('gemini');
  });

  it('throws for an unknown provider', () => {
    expect(() =>
      createAdapter({ provider: 'bogus' as Parameters<typeof createAdapter>[0]['provider'] }),
    ).toThrow(/unknown ai provider/i);
  });
});
