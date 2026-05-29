import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./translate/run.js', () => ({ runTranslate: vi.fn() }));
vi.mock('@langsync/shared/logger', () => ({
  logger: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { Command } from 'commander';
import { logger } from '@langsync/shared/logger';
import { runTranslate } from './translate/run.js';
import { registerTranslateCommand } from './translate.js';

const mockedRunTranslate = vi.mocked(runTranslate);
const mockedLogger = vi.mocked(logger);

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerTranslateCommand(program);
  return program;
}

async function runCli(...args: string[]): Promise<void> {
  await buildProgram().parseAsync(['node', 'langsync', 'translate', ...args]);
}

// Minimal valid result — tests add the fields they care about.
function makeResult(
  overrides: Partial<ReturnType<typeof runTranslate> extends Promise<infer R> ? R : never> = {},
) {
  return {
    provider: 'openai' as const,
    referenceLocale: 'en',
    written: [],
    planned: [],
    translatedByLocale: {},
    skippedByLocale: {},
    totalTranslatableKeys: 0,
    ...overrides,
  };
}

describe('registerTranslateCommand', () => {
  beforeEach(() => {
    process.exitCode = undefined;
    mockedRunTranslate.mockReset();
    vi.clearAllMocks();
  });
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('forwards the provider, model, max-keys, and dry-run flags to runTranslate', async () => {
    mockedRunTranslate.mockResolvedValue(makeResult({ totalTranslatableKeys: 0 }));

    await runCli(
      '--provider',
      'anthropic',
      '--model',
      'claude-haiku-4-5',
      '--max-keys',
      '10',
      '--dry-run',
    );

    expect(mockedRunTranslate).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: true,
        provider: 'anthropic',
        model: 'claude-haiku-4-5',
        maxKeys: 10,
      }),
    );
  });

  it('dry-run with nothing to translate logs info message', async () => {
    mockedRunTranslate.mockResolvedValue(makeResult({ totalTranslatableKeys: 0 }));

    await runCli('--dry-run');

    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Nothing to translate'));
    expect(mockedLogger.success).not.toHaveBeenCalled();
  });

  it('dry-run with keys to translate shows key counts via logger.info', async () => {
    mockedRunTranslate.mockResolvedValue(
      makeResult({
        translatedByLocale: { de: ['a', 'b'], fr: ['a'] },
        totalTranslatableKeys: 3,
      }),
    );

    await runCli('--dry-run');

    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Would translate'));
    expect(mockedLogger.success).not.toHaveBeenCalled();
  });

  it('reports written files on a non-dry-run translate', async () => {
    mockedRunTranslate.mockResolvedValue(
      makeResult({
        written: ['/p/i18n/de.json'],
        planned: ['/p/i18n/de.json'],
        translatedByLocale: { de: ['b'], fr: [] },
        totalTranslatableKeys: 1,
      }),
    );

    await runCli();

    expect(mockedLogger.success).toHaveBeenCalledWith(expect.stringContaining('Translated'));
    expect(mockedLogger.success).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Wrote'));
    expect(process.exitCode).toBeUndefined();
  });

  it('warns when some keys were skipped due to --max-keys', async () => {
    mockedRunTranslate.mockResolvedValue(
      makeResult({
        written: ['/p/i18n/de.json'],
        planned: ['/p/i18n/de.json'],
        translatedByLocale: { de: ['a'] },
        skippedByLocale: { de: ['b', 'c'] },
        totalTranslatableKeys: 3,
      }),
    );

    await runCli('--max-keys', '1');

    expect(mockedLogger.warn).toHaveBeenCalledWith(expect.stringContaining('skipped'));
  });

  it('logs an informational message when there is nothing to translate', async () => {
    mockedRunTranslate.mockResolvedValue(
      makeResult({ translatedByLocale: { de: [] }, totalTranslatableKeys: 0 }),
    );

    await runCli();

    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Nothing to translate'));
    expect(mockedLogger.success).not.toHaveBeenCalled();
  });

  it('rejects invalid --max-keys values', async () => {
    await runCli('--max-keys', 'abc');

    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('--max-keys must be a positive integer'),
    );
    expect(process.exitCode).toBe(1);
    expect(mockedRunTranslate).not.toHaveBeenCalled();
  });

  it('logs the error and sets a failing exit code when runTranslate throws', async () => {
    mockedRunTranslate.mockRejectedValue(new Error('boom'));

    await runCli();

    expect(mockedLogger.error).toHaveBeenCalledWith('boom');
    expect(process.exitCode).toBe(1);
  });

  it('stringifies non-Error rejections', async () => {
    mockedRunTranslate.mockRejectedValue('plain failure');

    await runCli();

    expect(mockedLogger.error).toHaveBeenCalledWith('plain failure');
    expect(process.exitCode).toBe(1);
  });
});
