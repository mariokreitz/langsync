import { defineConfig } from 'tsup';
import pkg from './package.json' with { type: 'json' };

// Inline only the @langsync/* workspace packages so the published CLI is
// self-contained. Every third-party dep (chalk, commander, exceljs, zod,
// cosmiconfig, etc.) stays external — it's listed in package.json
// dependencies and npm resolves it at install time.
const workspaceDeps = [
  '@langsync/shared',
  '@langsync/core',
  '@langsync/excel-engine',
  '@langsync/ai-engine',
];
const externalDeps = Object.keys(pkg.dependencies ?? {});

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
  },
  format: ['esm'],
  target: 'node22',
  dts: true,
  sourcemap: false,
  clean: true,
  splitting: false,
  treeshake: true,
  shims: false,
  // Single source of truth for the version: packages/cli/package.json
  // (bumped by Changesets). Injected so `--version` and the banner never drift.
  define: {
    __LANGSYNC_VERSION__: JSON.stringify(pkg.version),
  },
  banner: ({ format }) => {
    if (format === 'esm') {
      return { js: '#!/usr/bin/env node' };
    }
    return {};
  },
  external: externalDeps,
  noExternal: workspaceDeps,
});
