import { afterEach, describe, expect, it, vi } from 'vitest';
import { availableProviders, createAdapter } from './index.js';

describe('createAdapter', () => {
  afterEach(() => {
    delete process.env.LANGSYNC_AI_EXPERIMENTAL;
    delete process.env.OPENAI_API_KEY;
    vi.clearAllMocks();
  });

  it('creates the OpenAI adapter', () => {
    const adapter = createAdapter({ provider: 'openai', apiKey: 'k' });
    expect(adapter.provider).toBe('openai');
  });

  it('throws a helpful error for not-yet-released providers', () => {
    expect(() => createAdapter({ provider: 'deepl', apiKey: 'k' })).toThrow(/not yet available/i);
  });

  it('exposes experimental providers when the flag is set', () => {
    process.env.LANGSYNC_AI_EXPERIMENTAL = '1';
    expect(availableProviders()).toEqual(['openai', 'deepl', 'anthropic', 'gemini']);
  });

  it('lists only released providers by default', () => {
    expect(availableProviders()).toEqual(['openai']);
  });
});
