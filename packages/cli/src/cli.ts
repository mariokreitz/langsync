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
import { registerTranslateCommand } from './commands/translate.js';
import { registerWatchCommand } from './commands/watch.js';

// Replaced at build time by tsup `define` with the version from package.json
// (the single source of truth, bumped by Changesets). The fallback only applies
// when running unbundled (e.g. via tsx in tests).
declare const __LANGSYNC_VERSION__: string;
const VERSION = typeof __LANGSYNC_VERSION__ === 'string' ? __LANGSYNC_VERSION__ : '0.0.0-dev';

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
  registerTranslateCommand(program);
  registerWatchCommand(program);
  registerExportCommand(program);
  registerImportCommand(program);

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message);
  process.exit(1);
});
