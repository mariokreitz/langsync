import { type Command } from 'commander';
import { logger } from '@langsync/shared/logger';

export function registerFindMissingCommand(program: Command): void {
  program
    .command('find-missing')
    .description('Find missing translation keys across locales.')
    .action(() => {
      logger.info('find-missing: missing-keys reporter (coming soon)');
    });
}
