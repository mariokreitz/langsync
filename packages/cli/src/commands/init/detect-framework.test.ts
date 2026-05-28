import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { vol } from 'memfs';
import { detectFramework } from './detect-framework.js';

vi.mock('node:fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

describe('detectFramework', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vol.reset();
  });

  it('detects i18next via dependencies', async () => {
    vol.fromJSON({
      '/project/package.json': JSON.stringify({
        dependencies: { i18next: '^23.0.0' },
      }),
    });
    expect(await detectFramework('/project')).toBe('i18next');
  });

  it('detects ngx-translate via devDependencies', async () => {
    vol.fromJSON({
      '/project/package.json': JSON.stringify({
        devDependencies: { '@ngx-translate/core': '^15.0.0' },
      }),
    });
    expect(await detectFramework('/project')).toBe('ngx-translate');
  });

  it('detects react-intl via dependencies', async () => {
    vol.fromJSON({
      '/project/package.json': JSON.stringify({
        dependencies: { 'react-intl': '^6.0.0' },
      }),
    });
    expect(await detectFramework('/project')).toBe('react-intl');
  });

  it('returns null when no known framework is present', async () => {
    vol.fromJSON({
      '/project/package.json': JSON.stringify({
        dependencies: { react: '^18.0.0' },
      }),
    });
    expect(await detectFramework('/project')).toBeNull();
  });

  it('returns null when package.json is missing', async () => {
    expect(await detectFramework('/nonexistent')).toBeNull();
  });
});
