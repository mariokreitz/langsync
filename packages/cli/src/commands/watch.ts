import { type Command } from 'commander';
import chalk from 'chalk';
import { join, relative } from 'node:path';
import chokidar from 'chokidar';
import { logger } from '@langsync/shared/logger';
import { resolveWatchDir, runWatchPass } from './watch/run.js';

interface WatchFlags {
  dryRun: boolean;
  debounce: string;
}

function reportPass(cwd: string, written: string[], issueCount: number): void {
  if (written.length === 0) {
    logger.info('No locale changes to sync.');
  } else {
    for (const path of written) {
      logger.success(`Synced ${chalk.bold(relative(cwd, path))}`);
    }
  }
  if (issueCount > 0) {
    logger.warn(`${chalk.yellow(String(issueCount))} validation issue(s) remaining.`);
  } else {
    logger.success('All locales are consistent.');
  }
}

export function registerWatchCommand(program: Command): void {
  program
    .command('watch')
    .description('Watch locale files and run incremental sync + validation on change.')
    .option('--dry-run', 'Report planned changes without writing files.', false)
    .option('--debounce <ms>', 'Debounce window for rapid file changes.', '200')
    .action(async (flags: WatchFlags) => {
      try {
        const cwd = process.cwd();
        const watchDir = await resolveWatchDir(cwd);
        const debounceMs = Number.parseInt(flags.debounce, 10) || 200;

        // Initial pass so the user sees current state immediately.
        const initial = await runWatchPass({ cwd, dryRun: flags.dryRun });
        reportPass(cwd, initial.written, initial.issues.length);

        logger.info(`Watching ${chalk.cyan(relative(cwd, watchDir) || '.')} for changes...`);

        const watcher = chokidar.watch(join(watchDir, '*.json'), {
          ignoreInitial: true,
        });

        let timer: NodeJS.Timeout | undefined;
        let running = false;
        const trigger = (): void => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            void (async () => {
              if (running) return;
              running = true;
              try {
                const pass = await runWatchPass({ cwd, dryRun: flags.dryRun });
                reportPass(cwd, pass.written, pass.issues.length);
              } catch (error: unknown) {
                logger.error(error instanceof Error ? error.message : String(error));
              } finally {
                running = false;
              }
            })();
          }, debounceMs);
        };

        watcher.on('change', trigger).on('add', trigger).on('unlink', trigger);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(message);
        process.exitCode = 1;
      }
    });
}
