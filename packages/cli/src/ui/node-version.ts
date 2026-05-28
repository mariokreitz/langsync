import chalk from 'chalk';

export function assertNodeVersion(minMajor: number): void {
  const current = process.versions.node;
  const major = Number.parseInt(current.split('.')[0] ?? '0', 10);
  if (major < minMajor) {
    console.error(
      chalk.red(
        `langsync requires Node.js >= ${String(minMajor)}. ` +
          `You are running ${current}. Please upgrade.`,
      ),
    );
    process.exit(1);
  }
}
