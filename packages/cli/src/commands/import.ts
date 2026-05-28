import { type Command } from 'commander';
import { logger } from '@langsync/shared/logger';

export function registerImportCommand(program: Command): void {
  const cmd = program.command('import').description('Import translations from external formats.');

  cmd
    .command('excel')
    .description('Import translations from an Excel workbook.')
    .action(() => {
      logger.info('import excel: Excel importer (coming soon)');
    });
}
