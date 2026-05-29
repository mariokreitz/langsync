import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { dirname, join, resolve, relative, sep, basename } from 'node:path';
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

export type NamespaceStructure = 'locale-dir' | 'locale-prefix';

export interface LoadLocaleFilesOptions {
  cwd: string;
  inputDir: string;
  locales: string[];
  namespaces?: { structure: NamespaceStructure };
}

export interface LoadedLocaleFile extends LocaleFile {
  exists: boolean;
}

export interface LocaleFileIndex {
  files: LoadedLocaleFile[];
  namespaces: string[];
  byLocale: Record<string, Map<string | null, LoadedLocaleFile>>;
}

function isWithinDirectory(path: string, directory: string): boolean {
  return path === directory || path.startsWith(directory + sep);
}

function validateNamespace(namespace: string, structure: NamespaceStructure): void {
  if (namespace.trim() === '') {
    throw new Error('Invalid namespace "": namespace must not be empty.');
  }
  if (namespace.includes('\\')) {
    throw new Error(`Invalid namespace "${namespace}": backslashes are not allowed.`);
  }
  if (namespace.startsWith('/')) {
    throw new Error(`Invalid namespace "${namespace}": absolute namespace paths are not allowed.`);
  }
  if (structure === 'locale-prefix' && namespace.includes('/')) {
    throw new Error(
      `Invalid namespace "${namespace}": locale-prefix namespaces must not contain '/'.`,
    );
  }
  if (namespace.split('/').some((segment) => segment === '.' || segment === '..')) {
    throw new Error(`Invalid namespace "${namespace}": path traversal segments are not allowed.`);
  }
}

export function resolveLocaleFilePath(args: {
  cwd: string;
  inputDir: string;
  locale: string;
  namespace: string | null;
  namespaces?: { structure: NamespaceStructure };
}): string {
  const inputAbs = resolve(args.cwd, args.inputDir);

  if (!args.namespaces) {
    if (args.namespace !== null) {
      throw new Error(
        `Invalid namespace "${args.namespace}": single-file mode cannot resolve a namespace.`,
      );
    }
    const path = resolve(inputAbs, `${args.locale}.json`);
    if (!isWithinDirectory(path, inputAbs)) {
      throw new Error(
        `Resolved locale file path escapes input directory for locale "${args.locale}".`,
      );
    }
    return path;
  }

  if (args.namespace === null) {
    throw new Error('Namespaced mode requires a non-null namespace.');
  }

  validateNamespace(args.namespace, args.namespaces.structure);

  const path =
    args.namespaces.structure === 'locale-dir'
      ? resolve(inputAbs, args.locale, `${args.namespace}.json`)
      : resolve(inputAbs, `${args.locale}.${args.namespace}.json`);

  if (!isWithinDirectory(path, inputAbs)) {
    throw new Error(
      `Resolved locale file path escapes input directory for namespace "${args.namespace}".`,
    );
  }

  return path;
}

async function readTranslationFile(path: string, logicalPath: string): Promise<TranslationTree> {
  const content = await readFile(path, 'utf-8');
  try {
    return JSON.parse(content) as TranslationTree;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${logicalPath}: ${message}`, { cause: error });
  }
}

async function listJsonFilesRecursive(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error: unknown) {
    const errno = (error as NodeJS.ErrnoException).code;
    if (errno === 'ENOENT') return [];
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFilesRecursive(path)));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(path);
    }
  }
  return files.sort();
}

async function listDirectJsonFiles(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error: unknown) {
    const errno = (error as NodeJS.ErrnoException).code;
    if (errno === 'ENOENT') return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => join(directory, entry.name))
    .sort();
}

function orderAndSynthesizeFiles(
  loaded: LoadedLocaleFile[],
  options: LoadLocaleFilesOptions,
): LoadedLocaleFile[] {
  const namespaces = [
    ...new Set(loaded.map((file) => file.namespace).filter((ns) => ns !== null)),
  ].sort();
  if (namespaces.length === 0) return [];

  const byKey = new Map(loaded.map((file) => [`${file.locale}\u0000${file.namespace}`, file]));
  const ordered: LoadedLocaleFile[] = [];
  for (const locale of options.locales) {
    for (const namespace of namespaces) {
      const key = `${locale}\u0000${namespace}`;
      const existing = byKey.get(key);
      if (existing) {
        ordered.push(existing);
        continue;
      }
      ordered.push({
        locale,
        namespace,
        path: resolveLocaleFilePath({
          cwd: options.cwd,
          inputDir: options.inputDir,
          locale,
          namespace,
          namespaces: options.namespaces,
        }),
        translations: {},
        exists: false,
      });
    }
  }
  return ordered;
}

/**
 * Load all configured locale JSON files. In single-file mode this reads
 * `<cwd>/<inputDir>/<locale>.json`; in namespaced mode it discovers namespace
 * files and synthesizes missing locale × namespace entries as empty trees.
 */
export async function loadLocaleFiles(
  options: LoadLocaleFilesOptions,
): Promise<LoadedLocaleFile[]> {
  const inputAbs = resolve(options.cwd, options.inputDir);

  if (!options.namespaces) {
    const out: LoadedLocaleFile[] = [];
    for (const locale of options.locales) {
      const path = resolveLocaleFilePath({
        cwd: options.cwd,
        inputDir: options.inputDir,
        locale,
        namespace: null,
      });
      let translations: TranslationTree = {};
      let exists = false;
      try {
        translations = await readTranslationFile(path, `${locale}.json`);
        exists = true;
      } catch (error: unknown) {
        const errno = (error as NodeJS.ErrnoException).code;
        if (errno !== 'ENOENT') throw error;
      }
      out.push({ locale, namespace: null, path, translations, exists });
    }
    return out;
  }

  const loaded: LoadedLocaleFile[] = [];

  if (options.namespaces.structure === 'locale-dir') {
    for (const locale of options.locales) {
      const localeDir = resolve(inputAbs, locale);
      if (!isWithinDirectory(localeDir, inputAbs)) {
        throw new Error(`Locale "${locale}" resolves outside the input directory.`);
      }
      const paths = await listJsonFilesRecursive(localeDir);
      for (const path of paths) {
        const namespace = relative(localeDir, path).slice(0, -'.json'.length).split(sep).join('/');
        validateNamespace(namespace, 'locale-dir');
        loaded.push({
          locale,
          namespace,
          path,
          translations: await readTranslationFile(path, `${locale}/${namespace}.json`),
          exists: true,
        });
      }
    }
    return orderAndSynthesizeFiles(loaded, options);
  }

  const sortedLocales = [...options.locales].sort((a, b) => b.length - a.length);
  const paths = await listDirectJsonFiles(inputAbs);
  for (const path of paths) {
    const fileName = basename(path);
    const locale = sortedLocales.find((candidate) => fileName.startsWith(`${candidate}.`));
    if (!locale) continue;

    const namespace = fileName.slice(locale.length + 1, -'.json'.length);
    // A plain `<locale>.json` (empty derived namespace) is not a namespaced
    // file in prefix mode — ignore it rather than crashing.
    if (namespace.trim() === '') continue;
    validateNamespace(namespace, 'locale-prefix');
    loaded.push({
      locale,
      namespace,
      path,
      translations: await readTranslationFile(path, fileName),
      exists: true,
    });
  }

  return orderAndSynthesizeFiles(loaded, options);
}

export function indexLocaleFiles(files: LoadedLocaleFile[]): LocaleFileIndex {
  const byLocale: Record<string, Map<string | null, LoadedLocaleFile>> = {};
  const namespaceSet = new Set<string>();

  for (const file of files) {
    byLocale[file.locale] ??= new Map<string | null, LoadedLocaleFile>();
    byLocale[file.locale]!.set(file.namespace, file);
    if (file.namespace !== null) namespaceSet.add(file.namespace);
  }

  return {
    files,
    namespaces: [...namespaceSet].sort(),
    byLocale,
  };
}
