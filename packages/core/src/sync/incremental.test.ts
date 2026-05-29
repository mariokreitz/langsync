import { describe, expect, it } from 'vitest';
import { diffTrees, hasChanges } from './incremental.js';

describe('diffTrees', () => {
  it('detects added keys', () => {
    const diff = diffTrees({ a: 'A' }, { a: 'A', b: 'B' });
    expect(diff.added).toEqual(['b']);
    expect(diff.changed).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it('detects removed keys', () => {
    const diff = diffTrees({ a: 'A', b: 'B' }, { a: 'A' });
    expect(diff.removed).toEqual(['b']);
  });

  it('detects changed values', () => {
    const diff = diffTrees({ a: 'A' }, { a: 'A2' });
    expect(diff.changed).toEqual(['a']);
  });

  it('handles nested trees with dot-notated keys', () => {
    const diff = diffTrees(
      { menu: { file: { open: 'Open' } } },
      { menu: { file: { open: 'Open', save: 'Save' } } },
    );
    expect(diff.added).toEqual(['menu.file.save']);
  });

  it('reports no changes for identical trees', () => {
    const diff = diffTrees({ a: 'A' }, { a: 'A' });
    expect(hasChanges(diff)).toBe(false);
  });

  it('hasChanges is true when anything differs', () => {
    expect(hasChanges(diffTrees({ a: 'A' }, { a: 'A', b: '' }))).toBe(true);
  });
});
