import { loadConfig } from '@langsync/shared/config';
import { loadLocaleFiles } from '@langsync/shared/fs';
import { validateLocales, type ValidationIssue } from '@langsync/core';

export interface RunValidateOptions {
  cwd: string;
}

export interface RunValidateResult {
  referenceLocale: string;
  issues: ValidationIssue[];
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
  if (config.namespaces) {
    throw new Error(
      'Namespace support for this command is coming in a follow-up release. ' +
        'Remove the `namespaces` block from your config to use single-file mode.',
    );
  }

  const referenceLocale = config.defaultLocale ?? config.locales[0]!;

  const files = await loadLocaleFiles({
    cwd: options.cwd,
    inputDir: config.input,
    locales: config.locales,
    namespaces: config.namespaces,
  });

  const issues = validateLocales(files, referenceLocale);
  const hasErrors = issues.some((i) => i.type === 'missing' || i.type === 'extra');

  return {
    referenceLocale,
    issues,
    exitCode: hasErrors ? 1 : 0,
  };
}
