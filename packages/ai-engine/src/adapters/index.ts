import { type AdapterOptions, type AIProvider, type TranslationAdapter } from '../types.js';
import { OpenAIAdapter } from './openai.js';
import { DeepLAdapter } from './deepl.js';
import { AnthropicAdapter } from './anthropic.js';
import { GeminiAdapter } from './gemini.js';

/**
 * Providers that are fully released and shown in CLI help.
 *
 * Graduation history:
 * - OpenAI: released at launch
 * - DeepL: released in Phase 1 (simple REST API, no model choice, free/pro)
 *
 * Anthropic and Gemini are still behind `LANGSYNC_AI_EXPERIMENTAL` pending
 * smoke-test sign-off.
 */
const RELEASED_PROVIDERS: readonly AIProvider[] = ['openai', 'deepl'];

const ALL_PROVIDERS: readonly AIProvider[] = ['openai', 'deepl', 'anthropic', 'gemini'];

function experimentalEnabled(): boolean {
  return process.env.LANGSYNC_AI_EXPERIMENTAL === '1';
}

/** Providers that can currently be selected (respects the experimental flag). */
export function availableProviders(): AIProvider[] {
  return experimentalEnabled() ? [...ALL_PROVIDERS] : [...RELEASED_PROVIDERS];
}

/**
 * Construct the translation adapter for the requested provider.
 *
 * @throws if the provider is unknown or not yet released.
 */
export function createAdapter(options: AdapterOptions): TranslationAdapter {
  if (!availableProviders().includes(options.provider)) {
    if (ALL_PROVIDERS.includes(options.provider)) {
      throw new Error(
        `AI provider "${options.provider}" is not yet available. ` +
          `Currently supported: ${availableProviders().join(', ')}.`,
      );
    }
    throw new Error(`Unknown AI provider "${options.provider}".`);
  }

  const { provider, ...rest } = options;
  switch (provider) {
    case 'openai':
      return new OpenAIAdapter(rest);
    case 'deepl':
      return new DeepLAdapter(rest);
    case 'anthropic':
      return new AnthropicAdapter(rest);
    case 'gemini':
      return new GeminiAdapter(rest);
    default: {
      // Exhaustiveness guard: every AIProvider must have a case above.
      const exhaustive: never = provider;
      throw new Error(`AI provider "${String(exhaustive)}" has no adapter implementation yet.`);
    }
  }
}

export { OpenAIAdapter, DeepLAdapter, AnthropicAdapter, GeminiAdapter };
