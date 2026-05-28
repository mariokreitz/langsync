import chalk from 'chalk';

export interface Logger {
  info: (message: string) => void;
  success: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
}

const PREFIX = chalk.bold.cyan('langsync');

export const logger: Logger = {
  info: (message) => console.log(`${PREFIX} ${chalk.blue('ℹ')} ${message}`),
  success: (message) => console.log(`${PREFIX} ${chalk.green('✔')} ${message}`),
  warn: (message) => console.warn(`${PREFIX} ${chalk.yellow('⚠')} ${message}`),
  error: (message) => console.error(`${PREFIX} ${chalk.red('✖')} ${message}`),
  debug: (message) => {
    if (process.env.LANGSYNC_DEBUG) {
      console.log(`${PREFIX} ${chalk.gray('•')} ${chalk.gray(message)}`);
    }
  },
};
