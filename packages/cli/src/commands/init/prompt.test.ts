import { beforeEach, describe, expect, it, vi } from 'vitest';
import prompts from 'prompts';
import { runInitPrompts } from './prompt.js';

vi.mock('prompts', () => ({
  default: vi.fn(),
}));

const promptsMock = vi.mocked(prompts);

describe('runInitPrompts', () => {
  beforeEach(() => {
    promptsMock.mockReset();
  });

  it('keeps --yes in single-file mode', async () => {
    const answers = await runInitPrompts({ detectedFramework: 'i18next', yes: true });

    expect(promptsMock).not.toHaveBeenCalled();
    expect(answers).toEqual({
      input: './src/i18n',
      output: './translations',
      locales: ['en', 'de'],
      defaultLocale: 'en',
      framework: 'i18next',
    });
  });

  it('omits namespaces for the interactive single-file layout', async () => {
    promptsMock.mockResolvedValueOnce({
      input: './src/i18n',
      localeLayout: 'single-file',
      output: './translations',
      locales: ['en', 'de'],
      defaultLocale: 'en',
      framework: 'none',
    });

    const answers = await runInitPrompts({ detectedFramework: null });

    expect(answers).toEqual({
      input: './src/i18n',
      output: './translations',
      locales: ['en', 'de'],
      defaultLocale: 'en',
      framework: 'none',
    });
  });

  it('maps a namespaced layout into namespaces and initialNamespaces', async () => {
    promptsMock.mockResolvedValueOnce({
      input: './src/i18n',
      localeLayout: 'locale-dir',
      initialNamespaces: ['common', 'auth/login'],
      output: './translations',
      locales: ['en', 'de'],
      defaultLocale: 'en',
      framework: 'i18next',
    });

    const answers = await runInitPrompts({ detectedFramework: 'i18next' });

    expect(answers).toMatchObject({
      namespaces: { structure: 'locale-dir' },
      initialNamespaces: ['common', 'auth/login'],
    });
  });

  it('registers the layout and conditional namespace prompts', async () => {
    promptsMock.mockResolvedValueOnce({
      input: './src/i18n',
      localeLayout: 'locale-prefix',
      initialNamespaces: ['common'],
      output: './translations',
      locales: ['en'],
      defaultLocale: 'en',
      framework: 'none',
    });

    await runInitPrompts({ detectedFramework: null });

    const questions = promptsMock.mock.calls[0]?.[0];
    expect(Array.isArray(questions)).toBe(true);
    if (!Array.isArray(questions)) throw new Error('Expected prompt questions array.');
    expect(questions[1]).toMatchObject({
      type: 'select',
      name: 'localeLayout',
      initial: 0,
    });
    expect(questions[2]).toMatchObject({
      name: 'initialNamespaces',
      message: 'Initial namespaces? (comma-separated)',
      initial: 'common',
    });
  });
});
