import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertNodeVersion } from './node-version.js';

describe('assertNodeVersion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not exit when the current Node.js version meets the minimum', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    // Stub process.versions with a high version that always passes
    vi.stubGlobal('process', { ...process, versions: { node: '22.0.0' } });

    assertNodeVersion(20);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('calls process.exit(1) when the current Node.js version is too old', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('process', { ...process, exit: exitSpy, versions: { node: '18.0.0' } });

    assertNodeVersion(20);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});
