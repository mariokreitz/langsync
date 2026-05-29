import { type Command } from 'commander';
import chalk from 'chalk';
import { logger } from '@langsync/shared/logger';
import { runFindMissing, type MissingEntry } from './find-missing/run.js';

interface FindMissingFlags {
  reporter: 'pretty' | 'json';
}

function formatMissingEntry(entry: MissingEntry): string {
  return entry.namespace === null ? entry.key : `${entry.namespace}:${entry.key}`;
}

export function registerFindMissingCommand(program: Command): void {
  program
    .command('find-missing')
    .description('Find missing translation keys across locales.')
    .option('--reporter <kind>', 'Output format: pretty | json.', 'pretty')
    .action(async (flags: FindMissingFlags) => {
      try {
        const { referenceLocale, missingByLocale, exitCode } = await runFindMissing({
          cwd: process.cwd(),
        });

        if (flags.reporter === 'json') {
          console.log(JSON.stringify({ referenceLocale, missingByLocale }, null, 2));
        } else if (Object.keys(missingByLocale).length === 0) {
          logger.success(`No missing keys relative to ${chalk.cyan(referenceLocale)}.`);
        } else {
          for (const [locale, keys] of Object.entries(missingByLocale)) {
            logger.warn(`${chalk.cyan(locale)} is missing ${keys.length} key(s):`);
            for (const entry of keys) console.log(`  - ${formatMissingEntry(entry)}`);
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
