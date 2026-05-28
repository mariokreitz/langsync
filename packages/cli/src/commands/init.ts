import { type Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { relative } from 'node:path';
import { logger } from '@langsync/shared/logger';
import { detectFramework } from './init/detect-framework.js';
import { runInitPrompts } from './init/prompt.js';
import { writeConfig, type ConfigFormat } from './init/write-config.js';

interface InitFlags {
  force: boolean;
  json: boolean;
  yes: boolean;
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new LangSync configuration in the current project.')
    .option('--force', 'Overwrite an existing config file without asking.', false)
    .option('--json', 'Emit langsync.config.json instead of langsync.config.ts.', false)
    .option('-y, --yes', 'Accept all defaults; skip prompts.', false)
    .action(async (flags: InitFlags) => {
      const cwd = process.cwd();
      const format: ConfigFormat = flags.json ? 'json' : 'ts';

      try {
        const detectSpinner = ora('Detecting i18n framework…').start();
        const detectedFramework = await detectFramework(cwd);
        detectSpinner.succeed(
          detectedFramework
            ? `Detected ${chalk.cyan(detectedFramework)}`
            : 'No known framework detected',
        );

        // prompts owns stdio — must NOT be wrapped in a spinner.
        const answers = await runInitPrompts({
          detectedFramework,
          yes: flags.yes,
        });

        const writeSpinner = ora('Writing config and scaffolding locale files…').start();
        const result = await writeConfig({
          cwd,
          answers,
          format,
          force: flags.force,
        });
        writeSpinner.succeed('Files written');

        console.log();
        logger.success(`Created ${chalk.bold(relative(cwd, result.configPath))}`);
        for (const localeFile of result.createdLocaleFiles) {
          logger.success(`Created ${chalk.bold(relative(cwd, localeFile))}`);
        }
        console.log();
        logger.info(`Next: run ${chalk.bold('langsync validate')} to check your locales.`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(message);
        process.exitCode = 1;
      }
    });
}
