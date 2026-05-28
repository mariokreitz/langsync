import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { type InitAnswers } from './prompt.js';

export type ConfigFormat = 'ts' | 'json';

export interface WriteConfigOptions {
  cwd: string;
  answers: InitAnswers;
  format: ConfigFormat;
  force: boolean;
}

export interface WriteConfigResult {
  configPath: string;
  createdLocaleFiles: string[];
}

const CANDIDATE_CONFIG_FILES = [
  'langsync.config.ts',
  'langsync.config.js',
  'langsync.config.mjs',
  'langsync.config.json',
];

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function findExistingConfig(cwd: string): Promise<string | null> {
  for (const file of CANDIDATE_CONFIG_FILES) {
    const full = join(cwd, file);
    if (await pathExists(full)) return full;
  }
  return null;
}

function renderTsConfig(answers: InitAnswers): string {
  const frameworkLine =
    answers.framework === 'none' ? '' : `  framework: '${answers.framework}',\n`;
  const localesArr = answers.locales.map((l) => `'${l}'`).join(', ');
  return `import { defineConfig } from 'langsync';

export default defineConfig({
  input: '${answers.input}',
  output: '${answers.output}',
  locales: [${localesArr}],
  defaultLocale: '${answers.defaultLocale}',
${frameworkLine}});
`;
}

function renderJsonConfig(answers: InitAnswers): string {
  const obj: Record<string, unknown> = {
    input: answers.input,
    output: answers.output,
    locales: answers.locales,
    defaultLocale: answers.defaultLocale,
  };
  if (answers.framework !== 'none') obj.framework = answers.framework;
  return JSON.stringify(obj, null, 2) + '\n';
}

/**
 * Write the LangSync config file and scaffold empty locale JSON stubs.
 * Refuses to overwrite an existing config unless `force` is set.
 */
export async function writeConfig(options: WriteConfigOptions): Promise<WriteConfigResult> {
  const { cwd, answers, format, force } = options;

  const existing = await findExistingConfig(cwd);
  if (existing && !force) {
    throw new Error(
      `A LangSync config already exists at ${existing}. Re-run with --force to overwrite.`,
    );
  }

  const configFilename = format === 'ts' ? 'langsync.config.ts' : 'langsync.config.json';
  const configPath = resolve(cwd, configFilename);
  const content = format === 'ts' ? renderTsConfig(answers) : renderJsonConfig(answers);

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, content, 'utf-8');

  // Scaffold empty locale stubs in the input directory.
  const inputDir = resolve(cwd, answers.input);
  await mkdir(inputDir, { recursive: true });
  const createdLocaleFiles: string[] = [];
  for (const locale of answers.locales) {
    const localePath = join(inputDir, `${locale}.json`);
    if (!(await pathExists(localePath))) {
      await writeFile(localePath, '{}\n', 'utf-8');
      createdLocaleFiles.push(localePath);
    }
  }

  return { configPath, createdLocaleFiles };
}
