import { describe, expect, it } from 'vitest';
import { syncTrees } from './index.js';

describe('syncTrees', () => {
  it('adds keys from source not present in target as empty strings', () => {
    const source = { a: 'A', b: 'B' };
    const target = { a: 'AA' };
    expect(syncTrees(source, target)).toEqual({ a: 'AA', b: '' });
  });

  it('preserves existing target values (target wins)', () => {
    const source = { a: 'sourceA' };
    const target = { a: 'targetA' };
    expect(syncTrees(source, target)).toEqual({ a: 'targetA' });
  });

  it('drops keys that exist in target but not in source', () => {
    const source = { a: 'A' };
    const target = { a: 'AA', removed: 'x' };
    expect(syncTrees(source, target)).toEqual({ a: 'AA' });
  });

  it('handles deeply nested trees', () => {
    const source = { greeting: { hello: 'Hi', bye: 'Bye' }, app: { name: 'LangSync' } };
    const target = { greeting: { hello: 'Hallo' } };
    expect(syncTrees(source, target)).toEqual({
      greeting: { hello: 'Hallo', bye: '' },
      app: { name: '' },
    });
  });
});
