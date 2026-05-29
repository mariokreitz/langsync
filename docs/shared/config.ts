import { defineConfig } from '@mariokreitz/langsync';

export default defineConfig({
  input: './src/i18n',
  output: './translations',
  locales: ['en', 'de', 'fr'],
  defaultLocale: 'en',
  framework: 'i18next',
  excel: {
    file: 'translations.xlsx',
    sheetName: 'Translations',
  },
  ai: {
    provider: 'openai',
    model: 'gpt-4o-mini',
  },
});
