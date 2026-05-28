import { type Command } from 'commander';
import { logger } from '@langsync/shared/logger';

export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate locale consistency, structure and missing keys.')
    .action(() => {
      logger.info('validate: validation engine (coming soon)');
    });
}
