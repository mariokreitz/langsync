import chalk from 'chalk';

export function printBanner(version: string): void {
  const title = chalk.bold.cyan('LangSync');
  const tagline = chalk.gray('Modern localization workflow tooling.');
  const ver = chalk.dim(`v${version}`);
  console.log(`\n  ${title}  ${ver}\n  ${tagline}\n`);
}
