import { defineConfig } from '@mariokreitz/langsync';

export default defineConfig({
  input: './src/i18n',
  output: './translations',
  locales: ['en', 'de', 'fr'],
  defaultLocale: 'en',
  framework: 'i18next',
  // Opt in to namespaced files when your project outgrows one file per locale.
  // namespaces: { structure: 'locale-dir' }, // ./src/i18n/en/common.json
  // namespaces: { structure: 'locale-prefix' }, // ./src/i18n/en.common.json
  excel: {
    file: 'translations.xlsx',
    sheetName: 'Translations',
  },
  ai: {
    provider: 'openai',
    model: 'gpt-5-mini',
  },
});
