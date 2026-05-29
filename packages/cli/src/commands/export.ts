import { type Command } from 'commander';
import chalk from 'chalk';
import { relative } from 'node:path';
import { logger } from '@langsync/shared/logger';
import { runExportExcel } from './export/run.js';

interface ExportExcelFlags {
  file?: string;
  sheet?: string;
}

export function registerExportCommand(program: Command): void {
  const cmd = program.command('export').description('Export translations to external formats.');

  cmd
    .command('excel')
    .description('Export translations to an Excel workbook.')
    .option('--file <path>', 'Output Excel file (overrides config).')
    .option('--sheet <name>', 'Worksheet name (overrides config).')
    .action(async (flags: ExportExcelFlags) => {
      try {
        const cwd = process.cwd();
        const { file, locales, namespaces } = await runExportExcel({
          cwd,
          file: flags.file,
          sheetName: flags.sheet,
        });
        const namespaceSummary =
          namespaces.length > 0
            ? ` across ${chalk.cyan(String(namespaces.length))} namespace(s)`
            : '';
        logger.success(
          `Exported ${chalk.cyan(String(locales.length))} locale(s)${namespaceSummary} to ${chalk.bold(
            relative(cwd, file),
          )}`,
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(message);
        process.exitCode = 1;
      }
    });
}
