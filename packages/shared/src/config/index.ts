import { cosmiconfig } from 'cosmiconfig';
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader';
import { z } from 'zod';
import { type I18nFramework } from '../types/index.js';

export const LangSyncConfigSchema = z.object({
  input: z.string().describe('Path to the source i18n directory.'),
  output: z.string().describe('Path to the output/translations directory.'),
  locales: z.array(z.string()).min(1).describe('List of supported locales.'),
  defaultLocale: z.string().optional(),
  framework: z
    .enum(['i18next', 'ngx-translate', 'react-intl', 'none'])
    .optional()
    .describe('i18n framework integration. Use `none` to opt out explicitly.'),
  excel: z
    .object({
      file: z.string().default('translations.xlsx'),
      sheetName: z.string().default('Translations'),
    })
    .optional(),
  ai: z
    .object({
      provider: z
        .enum(['openai', 'deepl', 'anthropic', 'gemini'])
        .default('openai')
        .describe('AI translation provider.'),
      apiKey: z
        .string()
        .optional()
        .describe('API key. Falls back to the provider-specific env var.'),
      model: z.string().optional().describe('Provider model id (e.g. gpt-5-mini).'),
    })
    .optional()
    .describe('AI translation settings.'),
});

export type LangSyncConfig = z.infer<typeof LangSyncConfigSchema>;

export interface LoadedConfig {
  config: LangSyncConfig;
  filepath: string;
}

/**
 * Define a typed LangSync config. Used in `langsync.config.ts`.
 *
 * @example
 *   export default defineConfig({
 *     input: './src/i18n',
 *     output: './translations',
 *     locales: ['en', 'de'],
 *   });
 */
export function defineConfig(config: LangSyncConfig): LangSyncConfig {
  return config;
}

export async function loadConfig(cwd: string = process.cwd()): Promise<LoadedConfig | null> {
  const explorer = cosmiconfig('langsync', {
    searchPlaces: [
      'langsync.config.ts',
      'langsync.config.js',
      'langsync.config.mjs',
      'langsync.config.json',
      '.langsyncrc',
      '.langsyncrc.json',
      'package.json',
    ],
    loaders: {
      '.ts': TypeScriptLoader(),
    },
  });

  const result = await explorer.search(cwd);
  if (!result) return null;

  const parsed = LangSyncConfigSchema.parse(result.config);
  return { config: parsed, filepath: result.filepath };
}

export type { I18nFramework };
