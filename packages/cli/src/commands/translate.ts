import { type Command } from 'commander';
import chalk from 'chalk';
import { relative } from 'node:path';
import { logger } from '@langsync/shared/logger';
import { type AIProvider } from '@langsync/ai-engine';
import { runTranslate } from './translate/run.js';

interface TranslateFlags {
  dryRun: boolean;
  provider?: AIProvider;
  model?: string;
}

export function registerTranslateCommand(program: Command): void {
  program
    .command('translate')
    .description('Fill empty values in non-reference locales using an AI provider.')
    .option('--provider <provider>', 'Override the configured AI provider.')
    .option('--model <model>', 'Override the configured provider model.')
    .option('--dry-run', 'Report what would be translated without writing files.', false)
    .action(async (flags: TranslateFlags) => {
      try {
        const cwd = process.cwd();
        const result = await runTranslate({
          cwd,
          dryRun: flags.dryRun,
          provider: flags.provider,
          model: flags.model,
        });

        const totals = Object.values(result.translatedByLocale).reduce(
          (sum, keys) => sum + keys.length,
          0,
        );

        if (totals === 0) {
          logger.info(`Nothing to translate with ${chalk.cyan(result.provider)}.`);
          return;
        }

        const verb = flags.dryRun ? 'Would translate' : 'Translated';
        for (const [locale, keys] of Object.entries(result.translatedByLocale)) {
          if (keys.length === 0) continue;
          logger.success(`${verb} ${chalk.bold(String(keys.length))} key(s) for ${locale}`);
        }

        if (!flags.dryRun) {
          for (const path of result.written) {
            logger.info(`Wrote ${chalk.bold(relative(cwd, path))}`);
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(message);
        process.exitCode = 1;
      }
    });
}
