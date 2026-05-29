import { cosmiconfig } from 'cosmiconfig';
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader';
import { z } from 'zod';
import { type I18nFramework } from '../types/index.js';

export const LangSyncConfigSchema = z.object({
  input: z.string().describe('Path to the source i18n directory.'),
  output: z
    .string()
    .default('./translations')
    .describe(
      'Base directory for translated output. Defaults to "./translations". ' +
        'Reserved for report and export output in future releases.',
    ),
  locales: z
    .array(z.string())
    .min(1)
    .describe('List of supported locales (e.g. ["en", "de", "fr"]).'),
  defaultLocale: z
    .string()
    .optional()
    .describe(
      'Reference locale. Keys from this locale are synced into all other locales. ' +
        'Defaults to the first entry in `locales`.',
    ),
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

/** The fully-parsed config type (all defaults applied). Used at runtime. */
export type LangSyncConfig = z.infer<typeof LangSyncConfigSchema>;

/**
 * The config authoring type (optional fields with defaults are truly optional).
 * Used as the parameter type for `defineConfig` so consumers do not have to
 * provide `output` when authoring a `langsync.config.ts`.
 */
export type LangSyncConfigInput = z.input<typeof LangSyncConfigSchema>;

export interface LoadedConfig {
  config: LangSyncConfig;
  filepath: string;
}

/**
 * Format a Zod validation error into a readable, human-friendly message
 * suitable for CLI output.
 */
function formatZodError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `  ${issue.path.join('.')}: ` : '  ';
    return `${path}${issue.message}`;
  });
  return `Invalid LangSync configuration:\n${issues.join('\n')}`;
}

/**
 * Define a typed LangSync config. Used in `langsync.config.ts`.
 *
 * The `output` field is optional — it defaults to `"./translations"`.
 * All other fields with defaults are also optional.
 *
 * @example
 *   export default defineConfig({
 *     input: './src/i18n',
 *     locales: ['en', 'de'],
 *   });
 */
export function defineConfig(config: LangSyncConfigInput): LangSyncConfigInput {
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

  const parsed = LangSyncConfigSchema.safeParse(result.config);
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }

  return { config: parsed.data, filepath: result.filepath };
}

export type { I18nFramework };
