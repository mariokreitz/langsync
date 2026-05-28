import { type Command } from 'commander';
import { logger } from '@langsync/shared/logger';

export function registerSyncCommand(program: Command): void {
  program
    .command('sync')
    .description('Synchronize translation keys across all configured locales.')
    .action(() => {
      logger.info('sync: cross-locale sync engine (coming soon)');
    });
}
