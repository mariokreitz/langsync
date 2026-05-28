import { describe, expect, it } from 'vitest';
import { flatten, unflatten } from './index.js';

describe('flatten', () => {
  it('flattens nested objects with dot notation', () => {
    expect(flatten({ a: { b: { c: 'x' } }, d: 'y' })).toEqual({ 'a.b.c': 'x', d: 'y' });
  });

  it('handles empty input', () => {
    expect(flatten({})).toEqual({});
  });
});

describe('unflatten', () => {
  it('expands dot-notated keys into nested trees', () => {
    expect(unflatten({ 'a.b.c': 'x', d: 'y' })).toEqual({ a: { b: { c: 'x' } }, d: 'y' });
  });

  it('is the inverse of flatten', () => {
    const tree = { greeting: { hello: 'Hi', bye: 'Bye' }, app: { name: 'LangSync' } };
    expect(unflatten(flatten(tree))).toEqual(tree);
  });
});
