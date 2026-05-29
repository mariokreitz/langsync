import { type AdapterOptions, type TranslateRequest, type TranslationAdapter } from '../types.js';

const FREE_ENDPOINT = 'https://api-free.deepl.com/v2/translate';
const PRO_ENDPOINT = 'https://api.deepl.com/v2/translate';
/** DeepL free-tier API keys always carry this suffix. */
const FREE_KEY_SUFFIX = ':fx';

interface DeepLTranslation {
  text?: string;
}
interface DeepLResponse {
  translations?: DeepLTranslation[];
}

export interface DeepLAdapterOptions extends Omit<AdapterOptions, 'provider'> {
  /**
   * Force the free (`api-free.deepl.com`) or pro (`api.deepl.com`) endpoint.
   * When omitted, the tier is auto-detected from the key's `:fx` suffix.
   */
  useFreeTier?: boolean;
}

/** Normalize a locale code to a DeepL language code, e.g. `en-US` -> `EN`. */
function toDeepLLang(locale: string): string {
  return locale.split('-')[0]!.toUpperCase();
}

/**
 * DeepL translation adapter.
 *
 * Uses an injectable `fetch` so it can be unit-tested without network access.
 * The API key is read from `options.apiKey` or the `DEEPL_API_KEY` env var.
 * Free-tier keys (suffix `:fx`) are routed to `api-free.deepl.com`; everything
 * else goes to the pro endpoint. Pass `useFreeTier` to override the detection.
 */
export class DeepLAdapter implements TranslationAdapter {
  readonly provider = 'deepl' as const;

  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: DeepLAdapterOptions = {}) {
    const apiKey = options.apiKey ?? process.env.DEEPL_API_KEY;
    if (!apiKey) {
      throw new Error(
        'DeepL API key missing. Set `ai.apiKey` in your config or the DEEPL_API_KEY env var.',
      );
    }
    this.apiKey = apiKey;
    const useFreeTier = options.useFreeTier ?? apiKey.endsWith(FREE_KEY_SUFFIX);
    this.endpoint = useFreeTier ? FREE_ENDPOINT : PRO_ENDPOINT;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async translate(request: TranslateRequest): Promise<string> {
    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `DeepL-Auth-Key ${this.apiKey}`,
      },
      body: JSON.stringify({
        text: [request.text],
        source_lang: toDeepLLang(request.sourceLocale),
        target_lang: toDeepLLang(request.targetLocale),
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepL request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as DeepLResponse;
    const content = data.translations?.[0]?.text?.trim();
    if (!content) {
      throw new Error('DeepL returned an empty translation.');
    }
    return content;
  }
}
