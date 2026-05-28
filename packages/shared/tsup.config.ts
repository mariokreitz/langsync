import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/logger/index.ts',
    'src/fs/index.ts',
    'src/config/index.ts',
    'src/types/index.ts',
  ],
  format: ['esm'],
  target: 'node22',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
