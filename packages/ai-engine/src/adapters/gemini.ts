import { type AdapterOptions, type TranslateRequest, type TranslationAdapter } from '../types.js';

const DEFAULT_MODEL = 'gemini-2.0-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiPart {
  text?: string;
}
interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}
interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

/**
 * Google Gemini (Generative Language API) translation adapter.
 *
 * Uses an injectable `fetch` so it can be unit-tested without network access.
 * The API key is read from `options.apiKey` or the `GEMINI_API_KEY` env var and
 * passed as the `?key=` query parameter, per the public REST API.
 */
export class GeminiAdapter implements TranslationAdapter {
  readonly provider = 'gemini' as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: Omit<AdapterOptions, 'provider'> = {}) {
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Gemini API key missing. Set `ai.apiKey` in your config or the GEMINI_API_KEY env var.',
      );
    }
    this.apiKey = apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async translate(request: TranslateRequest): Promise<string> {
    const url = `${BASE_URL}/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                'You are a professional software localization engine. Translate the user ' +
                `message from ${request.sourceLocale} to ${request.targetLocale}. ` +
                'Preserve placeholders, ICU syntax, and surrounding punctuation. ' +
                'Respond with the translation only, no quotes or commentary.',
            },
          ],
        },
        contents: [{ parts: [{ text: request.text }] }],
        generationConfig: { temperature: 0 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!content) {
      throw new Error('Gemini returned an empty translation.');
    }
    return content;
  }
}
