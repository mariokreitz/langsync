import { type AdapterOptions, type TranslateRequest, type TranslationAdapter } from '../types.js';

const DEFAULT_MODEL = 'claude-haiku-4-5';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 1024;

interface AnthropicContentBlock {
  type?: string;
  text?: string;
}
interface AnthropicResponse {
  content?: AnthropicContentBlock[];
}

/**
 * Anthropic (Claude) Messages API translation adapter.
 *
 * Uses an injectable `fetch` so it can be unit-tested without network access.
 * The API key is read from `options.apiKey` or the `ANTHROPIC_API_KEY` env var.
 */
export class AnthropicAdapter implements TranslationAdapter {
  readonly provider = 'anthropic' as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: Omit<AdapterOptions, 'provider'> = {}) {
    const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Anthropic API key missing. Set `ai.apiKey` in your config or the ANTHROPIC_API_KEY env var.',
      );
    }
    this.apiKey = apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async translate(request: TranslateRequest): Promise<string> {
    const response = await this.fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: MAX_TOKENS,
        system:
          'You are a professional software localization engine. Translate the user ' +
          `message from ${request.sourceLocale} to ${request.targetLocale}. ` +
          'Preserve placeholders, ICU syntax, and surrounding punctuation. ' +
          'Respond with the translation only, no quotes or commentary.',
        messages: [{ role: 'user', content: request.text }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    const content = data.content
      ?.find((block) => block.type === 'text' || block.text)
      ?.text?.trim();
    if (!content) {
      throw new Error('Anthropic returned an empty translation.');
    }
    return content;
  }
}
