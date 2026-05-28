import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { type LocaleFile, type TranslationTree } from '../types/index.js';

export async function readJson<T = unknown>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function writeJson(
  filePath: string,
  data: unknown,
  { indent = 2 }: { indent?: number } = {},
): Promise<void> {
  const absolute = resolve(filePath);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, JSON.stringify(data, null, indent) + '\n', 'utf-8');
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export interface LoadLocaleFilesOptions {
  cwd: string;
  inputDir: string;
  locales: string[];
}

/**
 * Load all configured locale JSON files from `<cwd>/<inputDir>/<locale>.json`.
 * Missing files are returned as empty translation trees so downstream tooling
 * (validate, sync, export) can still operate on a complete locale list.
 */
export async function loadLocaleFiles(options: LoadLocaleFilesOptions): Promise<LocaleFile[]> {
  const inputAbs = resolve(options.cwd, options.inputDir);
  const out: LocaleFile[] = [];

  for (const locale of options.locales) {
    const path = join(inputAbs, `${locale}.json`);
    let translations: TranslationTree = {};
    try {
      const content = await readFile(path, 'utf-8');
      try {
        translations = JSON.parse(content) as TranslationTree;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to parse ${locale}.json: ${message}`, { cause: error });
      }
    } catch (error: unknown) {
      const errno = (error as NodeJS.ErrnoException).code;
      if (errno !== 'ENOENT') throw error;
    }
    out.push({ locale, path, translations });
  }

  return out;
}
