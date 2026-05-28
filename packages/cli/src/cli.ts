import { Command } from 'commander';
import { logger } from '@langsync/shared/logger';
import { printBanner } from './ui/banner.js';
import { assertNodeVersion } from './ui/node-version.js';
import { registerInitCommand } from './commands/init.js';
import { registerSyncCommand } from './commands/sync.js';
import { registerValidateCommand } from './commands/validate.js';
import { registerFindMissingCommand } from './commands/find-missing.js';
import { registerExportCommand } from './commands/export.js';
import { registerImportCommand } from './commands/import.js';

const VERSION = '0.0.0';

async function main(): Promise<void> {
  assertNodeVersion(22);

  const program = new Command();

  program
    .name('langsync')
    .description('Modern localization workflow tooling for TypeScript applications.')
    .version(VERSION, '-v, --version', 'Output the current version.')
    .hook('preAction', () => {
      printBanner(VERSION);
    });

  registerInitCommand(program);
  registerSyncCommand(program);
  registerValidateCommand(program);
  registerFindMissingCommand(program);
  registerExportCommand(program);
  registerImportCommand(program);

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message);
  process.exit(1);
});
