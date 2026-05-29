import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { logger } from './index.js';

describe('logger', () => {
  let infoSpy: MockInstance<unknown[], void>;
  let warnSpy: MockInstance<unknown[], void>;
  let errorSpy: MockInstance<unknown[], void>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LANGSYNC_DEBUG;
  });

  it('info: calls console.log with the message', () => {
    logger.info('test info');
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('test info'));
  });

  it('success: calls console.log with the message', () => {
    logger.success('all done');
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('all done'));
  });

  it('warn: calls console.warn with the message', () => {
    logger.warn('heads up');
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('heads up'));
  });

  it('error: calls console.error with the message', () => {
    logger.error('something broke');
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('something broke'));
  });

  it('debug: does NOT call console.log when LANGSYNC_DEBUG is unset', () => {
    logger.debug('verbose detail');
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('debug: calls console.log when LANGSYNC_DEBUG is set', () => {
    process.env.LANGSYNC_DEBUG = '1';
    logger.debug('verbose detail');
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('verbose detail'));
  });

  it('each method includes the "langsync" prefix', () => {
    logger.info('x');
    logger.warn('y');
    logger.error('z');

    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('langsync'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('langsync'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('langsync'));
  });
});
