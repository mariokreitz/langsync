import { type Command } from 'commander';
import chalk from 'chalk';
import { relative } from 'node:path';
import { logger } from '@langsync/shared/logger';
import { runSync } from './sync/run.js';

interface SyncFlags {
  dryRun: boolean;
}

export function registerSyncCommand(program: Command): void {
  program
    .command('sync')
    .description('Synchronize translation keys across all configured locales.')
    .option('--dry-run', 'Report planned changes without writing files.', false)
    .action(async (flags: SyncFlags) => {
      try {
        const cwd = process.cwd();
        const { written, planned, referenceLocale } = await runSync({
          cwd,
          dryRun: flags.dryRun,
        });

        const targets = flags.dryRun ? planned : written;
        if (targets.length === 0) {
          logger.info(`Nothing to sync against ${chalk.cyan(referenceLocale)}.`);
        } else {
          const verb = flags.dryRun ? 'Would update' : 'Updated';
          for (const path of targets) {
            logger.success(`${verb} ${chalk.bold(relative(cwd, path))}`);
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(message);
        process.exitCode = 1;
      }
    });
}
