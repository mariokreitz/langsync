import { validateLocales, type ValidationIssue } from '@langsync/core';
import { loadConfig } from '@langsync/shared/config';
import { indexLocaleFiles, loadLocaleFiles } from '@langsync/shared/fs';
import { noNamespacesError } from '../shared/namespace-error.js';

export interface RunValidateOptions {
  cwd: string;
}

export type NamespacedValidationIssue = ValidationIssue & {
  namespace: string | null;
  path: string;
};

export interface RunValidateResult {
  referenceLocale: string;
  issues: NamespacedValidationIssue[];
  exitCode: 0 | 1;
}

/**
 * Validate the locale files configured in the LangSync config at `cwd`.
 *
 * - `missing` and `extra` issues are treated as errors (exit code 1).
 * - `empty` issues are treated as warnings only (exit code 0).
 */
export async function runValidate(options: RunValidateOptions): Promise<RunValidateResult> {
  const loaded = await loadConfig(options.cwd);
  if (!loaded) {
    throw new Error('No LangSync config found. Run `langsync init` first.');
  }

  const { config } = loaded;
  const referenceLocale = config.defaultLocale ?? config.locales[0]!;

  const files = await loadLocaleFiles({
    cwd: options.cwd,
    inputDir: config.input,
    locales: config.locales,
    namespaces: config.namespaces,
  });
  const index = indexLocaleFiles(files);
  const namespaced = config.namespaces !== undefined;
  if (namespaced && index.namespaces.length === 0) {
    throw noNamespacesError(referenceLocale, config.input);
  }
  const nsKeys: (string | null)[] = namespaced ? index.namespaces : [null];

  const issues: NamespacedValidationIssue[] = [];
  for (const nsKey of nsKeys) {
    const namespaceFiles = config.locales
      .map((locale) => index.byLocale[locale]?.get(nsKey))
      .filter((file) => file !== undefined);
    const namespaceIssues = validateLocales(namespaceFiles, referenceLocale);
    for (const issue of namespaceIssues) {
      const file = index.byLocale[issue.locale]?.get(nsKey);
      if (!file) continue;
      issues.push({ ...issue, namespace: nsKey, path: file.path });
    }
  }

  issues.sort((a, b) => {
    const namespaceA = a.namespace ?? '';
    const namespaceB = b.namespace ?? '';
    return (
      a.locale.localeCompare(b.locale) ||
      namespaceA.localeCompare(namespaceB) ||
      a.key.localeCompare(b.key) ||
      a.type.localeCompare(b.type)
    );
  });

  const hasErrors = issues.some((i) => i.type === 'missing' || i.type === 'extra');

  return {
    referenceLocale,
    issues,
    exitCode: hasErrors ? 1 : 0,
  };
}
