import { runValidate } from '../validate/run.js';

export interface RunFindMissingOptions {
  cwd: string;
}

export interface MissingEntry {
  namespace: string | null;
  key: string;
  path: string;
}

export interface RunFindMissingResult {
  referenceLocale: string;
  missingByLocale: Record<string, MissingEntry[]>;
  exitCode: 0 | 1;
}

/**
 * Report missing translation keys per locale, relative to the reference locale.
 */
export async function runFindMissing(
  options: RunFindMissingOptions,
): Promise<RunFindMissingResult> {
  const { issues, referenceLocale } = await runValidate({ cwd: options.cwd });

  const missingByLocale: Record<string, MissingEntry[]> = {};
  for (const issue of issues) {
    if (issue.type !== 'missing') continue;
    (missingByLocale[issue.locale] ??= []).push({
      namespace: issue.namespace,
      key: issue.key,
      path: issue.path,
    });
  }
  for (const entries of Object.values(missingByLocale)) {
    entries.sort(
      (a, b) => (a.namespace ?? '').localeCompare(b.namespace ?? '') || a.key.localeCompare(b.key),
    );
  }

  const exitCode: 0 | 1 = Object.keys(missingByLocale).length === 0 ? 0 : 1;
  return { referenceLocale, missingByLocale, exitCode };
}
