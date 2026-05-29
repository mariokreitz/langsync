import { type Command } from 'commander';
import chalk from 'chalk';
import { relative } from 'node:path';
import { logger } from '@langsync/shared/logger';
import { type AIProvider, TranslationAdapterError } from '@langsync/ai-engine';
import { runTranslate } from './translate/run.js';

interface TranslateFlags {
  dryRun: boolean;
  provider?: AIProvider;
  model?: string;
  maxKeys?: string;
}

export function registerTranslateCommand(program: Command): void {
  program
    .command('translate')
    .description('Fill empty values in non-reference locales using an AI provider.')
    .option('--provider <provider>', 'Override the configured AI provider.')
    .option('--model <model>', 'Override the configured provider model.')
    .option(
      '--max-keys <n>',
      'Limit the total number of keys translated per run. ' +
        'Keys are selected deterministically: target locales in config order, ' +
        'then keys in reference order. Useful for controlling API spend.',
    )
    .option('--dry-run', 'Report what would be translated without writing files.', false)
    .action(async (flags: TranslateFlags) => {
      try {
        const cwd = process.cwd();
        const maxKeys = flags.maxKeys ? Number.parseInt(flags.maxKeys, 10) : undefined;

        if (maxKeys !== undefined && (Number.isNaN(maxKeys) || maxKeys <= 0)) {
          logger.error('--max-keys must be a positive integer.');
          process.exitCode = 1;
          return;
        }

        const result = await runTranslate({
          cwd,
          dryRun: flags.dryRun,
          provider: flags.provider,
          model: flags.model,
          maxKeys,
        });

        const totals = Object.values(result.translatedByLocale).reduce(
          (sum, keys) => sum + keys.length,
          0,
        );

        if (flags.dryRun) {
          if (result.totalTranslatableKeys === 0) {
            logger.info(`Nothing to translate with ${chalk.cyan(result.provider)}.`);
          } else {
            const capped = maxKeys !== undefined && maxKeys < result.totalTranslatableKeys;
            logger.info(
              `[dry-run] Would translate ${chalk.bold(String(totals))} key(s) ` +
                `across ${Object.keys(result.translatedByLocale).length} locale(s) ` +
                `using ${chalk.cyan(result.provider)}.`,
            );
            if (capped) {
              logger.info(
                `[dry-run] ${result.totalTranslatableKeys - totals} key(s) skipped ` +
                  `due to --max-keys ${String(maxKeys)}.`,
              );
            }
            for (const [locale, keys] of Object.entries(result.translatedByLocale)) {
              if (keys.length === 0) continue;
              logger.info(`[dry-run]   ${locale}: ${String(keys.length)} key(s)`);
            }
          }
          return;
        }

        if (totals === 0) {
          logger.info(`Nothing to translate with ${chalk.cyan(result.provider)}.`);
          return;
        }

        for (const [locale, keys] of Object.entries(result.translatedByLocale)) {
          if (keys.length === 0) continue;
          logger.success(`Translated ${chalk.bold(String(keys.length))} key(s) for ${locale}`);
        }

        for (const path of result.written) {
          logger.info(`Wrote ${chalk.bold(relative(cwd, path))}`);
        }

        const totalSkipped = Object.values(result.skippedByLocale).reduce(
          (sum, keys) => sum + keys.length,
          0,
        );
        if (totalSkipped > 0) {
          logger.warn(
            `${chalk.yellow(String(totalSkipped))} key(s) skipped due to --max-keys. ` +
              `Run again to translate remaining keys.`,
          );
        }
      } catch (error: unknown) {
        if (error instanceof TranslationAdapterError) {
          const statusInfo = error.statusCode ? ` (${String(error.statusCode)})` : '';
          logger.error(`${error.provider} translation failed${statusInfo}: ${error.message}`);
          if (error.statusCode === 429) {
            logger.info('Rate limited. Retry in a moment, or use --max-keys to reduce requests.');
          }
        } else {
          logger.error(error instanceof Error ? error.message : String(error));
        }
        process.exitCode = 1;
      }
    });
}
