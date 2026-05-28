import { runValidate } from '../validate/run.js';

export interface RunFindMissingOptions {
  cwd: string;
}

export interface RunFindMissingResult {
  referenceLocale: string;
  missingByLocale: Record<string, string[]>;
  exitCode: 0 | 1;
}

/**
 * Report missing translation keys per locale, relative to the reference locale.
 */
export async function runFindMissing(
  options: RunFindMissingOptions,
): Promise<RunFindMissingResult> {
  const { issues, referenceLocale } = await runValidate({ cwd: options.cwd });

  const missingByLocale: Record<string, string[]> = {};
  for (const issue of issues) {
    if (issue.type !== 'missing') continue;
    (missingByLocale[issue.locale] ??= []).push(issue.key);
  }
  for (const locale of Object.keys(missingByLocale)) {
    missingByLocale[locale]!.sort();
  }

  const exitCode: 0 | 1 = Object.keys(missingByLocale).length === 0 ? 0 : 1;
  return { referenceLocale, missingByLocale, exitCode };
}
