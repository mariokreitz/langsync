import prompts from 'prompts';
import { type I18nFramework } from '@langsync/shared/types';

export interface InitAnswers {
  input: string;
  output: string;
  locales: string[];
  defaultLocale: string;
  framework: I18nFramework | 'none';
}

export interface InitPromptOptions {
  detectedFramework: I18nFramework | null;
  /** When true, skip prompts and use defaults (with detected framework). */
  yes?: boolean;
}

const FRAMEWORK_CHOICES = [
  { title: 'i18next', value: 'i18next' as const },
  { title: 'ngx-translate (Angular)', value: 'ngx-translate' as const },
  { title: 'react-intl', value: 'react-intl' as const },
  { title: 'None / Custom', value: 'none' as const },
];

const DEFAULTS = {
  input: './src/i18n',
  output: './translations',
  locales: 'en,de',
  defaultLocale: 'en',
};

export async function runInitPrompts(options: InitPromptOptions): Promise<InitAnswers> {
  const framework: InitAnswers['framework'] = options.detectedFramework ?? 'none';

  if (options.yes) {
    return {
      input: DEFAULTS.input,
      output: DEFAULTS.output,
      locales: DEFAULTS.locales.split(',').map((l) => l.trim()),
      defaultLocale: DEFAULTS.defaultLocale,
      framework,
    };
  }

  const response = await prompts(
    [
      {
        type: 'text',
        name: 'input',
        message: 'Where are your source i18n files?',
        initial: DEFAULTS.input,
      },
      {
        type: 'text',
        name: 'output',
        message: 'Where should translation output go?',
        initial: DEFAULTS.output,
      },
      {
        type: 'text',
        name: 'locales',
        message: 'Which locales? (comma-separated)',
        initial: DEFAULTS.locales,
        format: (value: string) =>
          value
            .split(',')
            .map((l) => l.trim())
            .filter(Boolean),
        validate: (value: string) => {
          const list = value
            .split(',')
            .map((l) => l.trim())
            .filter(Boolean);
          return list.length > 0 ? true : 'Please provide at least one locale.';
        },
      },
      {
        type: 'text',
        name: 'defaultLocale',
        message: 'Default (reference) locale?',
        initial: DEFAULTS.defaultLocale,
      },
      {
        type: 'select',
        name: 'framework',
        message: 'Which i18n framework do you use?',
        choices: FRAMEWORK_CHOICES,
        initial: FRAMEWORK_CHOICES.findIndex((c) => c.value === framework),
      },
    ],
    {
      onCancel: () => {
        throw new Error('Aborted by user.');
      },
    },
  );

  // prompts() returns a typed-erased Answers record; trust our shape.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return response as InitAnswers;
}
