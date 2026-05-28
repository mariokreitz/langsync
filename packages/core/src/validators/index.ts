import { type LocaleFile } from '@langsync/shared/types';
import { flatten } from '../parsers/index.js';

export interface ValidationIssue {
  type: 'missing' | 'extra' | 'empty';
  locale: string;
  key: string;
}

/**
 * Compare locales against a reference locale and report missing/extra/empty keys.
 */
export function validateLocales(files: LocaleFile[], referenceLocale: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const reference = files.find((f) => f.locale === referenceLocale);
  if (!reference) return issues;

  const referenceKeys = new Set(Object.keys(flatten(reference.translations)));

  for (const file of files) {
    const flat = flatten(file.translations);
    const fileKeys = new Set(Object.keys(flat));

    if (file.locale !== referenceLocale) {
      for (const key of referenceKeys) {
        if (!fileKeys.has(key)) issues.push({ type: 'missing', locale: file.locale, key });
      }
      for (const key of fileKeys) {
        if (!referenceKeys.has(key)) issues.push({ type: 'extra', locale: file.locale, key });
      }
    }

    for (const [key, value] of Object.entries(flat)) {
      if (!value || value.trim() === '') issues.push({ type: 'empty', locale: file.locale, key });
    }
  }

  return issues;
}
