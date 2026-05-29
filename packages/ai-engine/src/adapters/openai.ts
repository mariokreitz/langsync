import { type AdapterOptions, type TranslateRequest, type TranslationAdapter } from '../types.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

interface OpenAIChoice {
  message?: { content?: string };
}
interface OpenAIResponse {
  choices?: OpenAIChoice[];
}

/**
 * OpenAI Chat Completions translation adapter.
 *
 * Uses an injectable `fetch` so it can be unit-tested without network access.
 * The API key is read from `options.apiKey` or the `OPENAI_API_KEY` env var.
 */
export class OpenAIAdapter implements TranslationAdapter {
  readonly provider = 'openai' as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: Omit<AdapterOptions, 'provider'> = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OpenAI API key missing. Set `ai.apiKey` in your config or the OPENAI_API_KEY env var.',
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
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You are a professional software localization engine. Translate the user ' +
              `message from ${request.sourceLocale} to ${request.targetLocale}. ` +
              'Preserve placeholders, ICU syntax, and surrounding punctuation. ' +
              'Respond with the translation only, no quotes or commentary.',
          },
          { role: 'user', content: request.text },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('OpenAI returned an empty translation.');
    }
    return content;
  }
}
