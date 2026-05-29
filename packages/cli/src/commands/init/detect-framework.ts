import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type I18nFramework } from '@langsync/shared/types';

interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const FRAMEWORK_SIGNATURES: readonly {
  framework: I18nFramework;
  packages: readonly string[];
}[] = [
  { framework: 'i18next', packages: ['i18next', 'react-i18next', 'i18next-vue', 'vue-i18next'] },
  { framework: 'ngx-translate', packages: ['@ngx-translate/core', '@ngx-translate/http-loader'] },
  { framework: 'react-intl', packages: ['react-intl', '@formatjs/intl'] },
];

/**
 * Detect the i18n framework used by the project at `cwd` by inspecting its `package.json`.
 * Returns `null` when no known framework dependency is present.
 */
export async function detectFramework(cwd: string): Promise<I18nFramework | null> {
  const pkgPath = join(cwd, 'package.json');
  let pkg: PackageJsonLike;
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as PackageJsonLike;
  } catch {
    return null;
  }

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };

  for (const { framework, packages } of FRAMEWORK_SIGNATURES) {
    if (packages.some((p) => p in allDeps)) return framework;
  }
  return null;
}
