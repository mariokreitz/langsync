import prompts from 'prompts';
import { type I18nFramework } from '@langsync/shared/types';

export type InitNamespaceStructure = 'locale-dir' | 'locale-prefix';
type InitLocaleLayout = 'single-file' | InitNamespaceStructure;

export interface InitAnswers {
  input: string;
  output: string;
  locales: string[];
  defaultLocale: string;
  framework: I18nFramework | 'none';
  namespaces?: { structure: InitNamespaceStructure };
  initialNamespaces?: string[];
}

export interface InitPromptOptions {
  detectedFramework: I18nFramework | null;
  /** When true, skip prompts and use defaults (with detected framework). */
  yes?: boolean;
}

interface RawInitAnswers {
  input: string;
  output: string;
  locales: string[];
  defaultLocale: string;
  framework: I18nFramework | 'none';
  localeLayout: InitLocaleLayout;
  initialNamespaces?: string[];
}

const FRAMEWORK_CHOICES = [
  { title: 'i18next', value: 'i18next' as const },
  { title: 'ngx-translate (Angular)', value: 'ngx-translate' as const },
  { title: 'react-intl', value: 'react-intl' as const },
  { title: 'None / Custom', value: 'none' as const },
];

const LOCALE_LAYOUT_CHOICES = [
  {
    title: 'Single file per locale (<input>/<locale>.json)',
    value: 'single-file' as const,
  },
  {
    title: 'Namespace folders per locale (<input>/<locale>/<namespace>.json)',
    value: 'locale-dir' as const,
  },
  {
    title: 'Flat namespace-prefixed files (<input>/<locale>.<namespace>.json)',
    value: 'locale-prefix' as const,
  },
];

const DEFAULTS = {
  input: './src/i18n',
  output: './translations',
  locales: 'en,de',
  defaultLocale: 'en',
};

function parseNamespaces(value: string): string[] {
  const namespaces = value
    .split(',')
    .map((namespace) => namespace.trim())
    .filter(Boolean);
  return namespaces.length > 0 ? namespaces : ['common'];
}

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

  const response = (await prompts(
    [
      {
        type: 'text',
        name: 'input',
        message: 'Where are your source i18n files?',
        initial: DEFAULTS.input,
      },
      {
        type: 'select',
        name: 'localeLayout',
        message: 'How should locale files be organized?',
        choices: LOCALE_LAYOUT_CHOICES,
        initial: 0,
      },
      {
        type: (prev: InitLocaleLayout) => (prev === 'single-file' ? null : 'text'),
        name: 'initialNamespaces',
        message: 'Initial namespaces? (comma-separated)',
        initial: 'common',
        format: parseNamespaces,
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
  )) as RawInitAnswers;

  const answers: InitAnswers = {
    input: response.input,
    output: response.output,
    locales: response.locales,
    defaultLocale: response.defaultLocale,
    framework: response.framework,
  };

  if (response.localeLayout !== 'single-file') {
    answers.namespaces = { structure: response.localeLayout };
    answers.initialNamespaces = response.initialNamespaces?.length
      ? response.initialNamespaces
      : ['common'];
  }

  return answers;
}
