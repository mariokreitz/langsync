import { type Command } from 'commander';
import chalk from 'chalk';
import { relative } from 'node:path';
import { logger } from '@langsync/shared/logger';
import { runImportExcel } from './import/run.js';

interface ImportExcelFlags {
  file?: string;
  sheet?: string;
  dryRun: boolean;
}

export function registerImportCommand(program: Command): void {
  const cmd = program.command('import').description('Import translations from external formats.');

  cmd
    .command('excel')
    .description('Import translations from an Excel workbook.')
    .option('--file <path>', 'Input Excel file (overrides config).')
    .option('--sheet <name>', 'Worksheet name (overrides config).')
    .option('--dry-run', 'Report planned writes without touching disk.', false)
    .action(async (flags: ImportExcelFlags) => {
      try {
        const cwd = process.cwd();
        const { written, planned, skipped } = await runImportExcel({
          cwd,
          file: flags.file,
          sheetName: flags.sheet,
          dryRun: flags.dryRun,
        });

        const targets = flags.dryRun ? planned : written;
        const verb = flags.dryRun ? 'Would write' : 'Wrote';
        for (const path of targets) {
          logger.success(`${verb} ${chalk.bold(relative(cwd, path))}`);
        }
        for (const locale of skipped) {
          logger.warn(`Skipped ${chalk.cyan(locale)} (not in configured locales).`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(message);
        process.exitCode = 1;
      }
    });
}
