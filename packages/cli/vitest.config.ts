import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/index.ts',
        'src/cli.ts',
        'src/ui/banner.ts',
        // Commander registration wrappers — thin integration entry points,
        // tested via their corresponding run.ts and e2e integration
        'src/commands/export.ts',
        'src/commands/find-missing.ts',
        'src/commands/import.ts',
        'src/commands/init.ts',
        'src/commands/sync.ts',
        'src/commands/translate.ts',
        'src/commands/validate.ts',
        'src/commands/watch.ts',
        // Interactive prompts — requires TTY, not suitable for unit tests
        'src/commands/init/prompt.ts',
      ],
    },
  },
});
