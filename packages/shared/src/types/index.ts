export type Locale = string;

export interface TranslationTree {
  [key: string]: string | TranslationTree;
}

export interface LocaleFile {
  locale: Locale;
  path: string;
  translations: TranslationTree;
}

export type I18nFramework = 'i18next' | 'ngx-translate' | 'react-intl';
