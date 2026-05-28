import { type Command } from 'commander';
import { logger } from '@langsync/shared/logger';

export function registerExportCommand(program: Command): void {
  const cmd = program.command('export').description('Export translations to external formats.');

  cmd
    .command('excel')
    .description('Export translations to an Excel workbook.')
    .action(() => {
      logger.info('export excel: Excel exporter (coming soon)');
    });
}
