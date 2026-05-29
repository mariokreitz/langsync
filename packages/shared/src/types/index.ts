export type Locale = string;

export interface TranslationTree {
  [key: string]: string | TranslationTree;
}

export type NamespaceName = string | null;

export interface LocaleFile {
  locale: Locale;
  namespace: NamespaceName;
  path: string;
  translations: TranslationTree;
}

export type I18nFramework = 'i18next' | 'ngx-translate' | 'react-intl' | 'none';
