export type AIProvider = 'openai' | 'deepl' | 'anthropic' | 'gemini';

export interface TranslateRequest {
  /** The source text to translate (a reference-locale value). */
  text: string;
  /** Reference/source locale code, e.g. `en`. */
  sourceLocale: string;
  /** Target locale code, e.g. `de`. */
  targetLocale: string;
}

/**
 * A provider-agnostic translation backend.
 *
 * New providers are added as new implementations of this interface
 * (Open/Closed Principle) — never by editing existing adapters.
 */
export interface TranslationAdapter {
  readonly provider: AIProvider;
  /** Translate a single string. Throws on provider/transport failure. */
  translate(request: TranslateRequest): Promise<string>;
}

export interface AdapterOptions {
  provider: AIProvider;
  /** Explicit API key; falls back to a provider-specific env var when omitted. */
  apiKey?: string;
  /** Provider model id; each adapter supplies a sensible default. */
  model?: string;
  /** Injectable fetch implementation (defaults to global `fetch`). For tests. */
  fetchImpl?: typeof fetch;
}
