import { type Command } from 'commander';
import chalk from 'chalk';
import { logger } from '@langsync/shared/logger';
import { runValidate } from './validate/run.js';

interface ValidateFlags {
  reporter: 'pretty' | 'json';
}

export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate locale consistency, structure and missing keys.')
    .option('--reporter <kind>', 'Output format: pretty | json.', 'pretty')
    .action(async (flags: ValidateFlags) => {
      try {
        const { issues, exitCode, referenceLocale } = await runValidate({ cwd: process.cwd() });

        if (flags.reporter === 'json') {
          console.log(JSON.stringify({ referenceLocale, issues }, null, 2));
        } else {
          if (issues.length === 0) {
            logger.success(`All locales are consistent with ${chalk.cyan(referenceLocale)}.`);
          } else {
            const byType = { missing: 0, extra: 0, empty: 0 };
            for (const issue of issues) {
              byType[issue.type]++;
              const colored =
                issue.type === 'empty' ? chalk.yellow(issue.type) : chalk.red(issue.type);
              logger.info(`${colored}  ${chalk.cyan(issue.locale)}  ${issue.key}`);
            }
            console.log();
            logger.info(
              `Summary: ${byType.missing} missing, ${byType.extra} extra, ${byType.empty} empty`,
            );
          }
        }

        process.exitCode = exitCode;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(message);
        process.exitCode = 1;
      }
    });
}
