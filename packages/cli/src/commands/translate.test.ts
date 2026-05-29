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

describe('registerTranslateCommand', () => {
  beforeEach(() => {
    process.exitCode = undefined;
    mockedRunTranslate.mockReset();
    vi.clearAllMocks();
  });
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('forwards the provider, model, and dry-run flags to runTranslate', async () => {
    mockedRunTranslate.mockResolvedValue({
      provider: 'anthropic',
      referenceLocale: 'en',
      written: [],
      planned: ['/p/i18n/de.json'],
      translatedByLocale: { de: ['b'] },
    });

    await runCli('--provider', 'anthropic', '--model', 'claude-haiku-4-5', '--dry-run');

    expect(mockedRunTranslate).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: true,
        provider: 'anthropic',
        model: 'claude-haiku-4-5',
      }),
    );
    // dry-run uses the "Would translate" verb and skips the written loop.
    expect(mockedLogger.success).toHaveBeenCalledWith(expect.stringContaining('Would translate'));
    expect(mockedLogger.info).not.toHaveBeenCalled();
  });

  it('reports written files on a non-dry-run translate', async () => {
    mockedRunTranslate.mockResolvedValue({
      provider: 'openai',
      referenceLocale: 'en',
      written: ['/p/i18n/de.json'],
      planned: ['/p/i18n/de.json'],
      translatedByLocale: { de: ['b'], fr: [] },
    });

    await runCli();

    expect(mockedLogger.success).toHaveBeenCalledWith(expect.stringContaining('Translated'));
    // The locale with zero keys is skipped, the written file is reported.
    expect(mockedLogger.success).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Wrote'));
    expect(process.exitCode).toBeUndefined();
  });

  it('logs an informational message when there is nothing to translate', async () => {
    mockedRunTranslate.mockResolvedValue({
      provider: 'openai',
      referenceLocale: 'en',
      written: [],
      planned: [],
      translatedByLocale: { de: [] },
    });

    await runCli();

    expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Nothing to translate'));
    expect(mockedLogger.success).not.toHaveBeenCalled();
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
