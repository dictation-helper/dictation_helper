import { describe, expect, it } from 'vitest';
import { mergeWeakWords, sortWeakWords } from './weakWords';
import type { WeakWord } from '../types';

const T1 = '2026-11-24T10:00:00.000Z';
const T2 = '2026-11-25T10:00:00.000Z';

describe('mergeWeakWords', () => {
  it('adds new words with count 1', () => {
    expect(mergeWeakWords([], ['apple', 'pear'], 's1', T1)).toEqual([
      { word: 'apple', count: 1, lastSeen: T1, scriptId: 's1' },
      { word: 'pear', count: 1, lastSeen: T1, scriptId: 's1' },
    ]);
  });
  it('counts a word once per take even when repeated', () => {
    expect(mergeWeakWords([], ['apple', 'apple'], null, T1)[0].count).toBe(1);
  });
  it('increments counts and updates lastSeen across takes', () => {
    const first = mergeWeakWords([], ['apple'], 's1', T1);
    const second = mergeWeakWords(first, ['apple', 'kiwi'], 's1', T2);
    expect(second.find((w) => w.word === 'apple')).toEqual({ word: 'apple', count: 2, lastSeen: T2, scriptId: 's1' });
    expect(second).toHaveLength(2);
  });
  it('keeps the same word separate per script and does not mutate input', () => {
    const first = mergeWeakWords([], ['apple'], 's1', T1);
    const frozen = JSON.stringify(first);
    const out = mergeWeakWords(first, ['apple'], 's2', T2);
    expect(out).toHaveLength(2);
    expect(JSON.stringify(first)).toBe(frozen);
  });
  it('ignores empty words', () => {
    expect(mergeWeakWords([], ['', ''], null, T1)).toEqual([]);
  });
});

describe('sortWeakWords', () => {
  it('sorts by count, then recency, then alphabetically', () => {
    const list: WeakWord[] = [
      { word: 'b', count: 1, lastSeen: T1, scriptId: null },
      { word: 'a', count: 1, lastSeen: T1, scriptId: null },
      { word: 'c', count: 3, lastSeen: T1, scriptId: null },
      { word: 'd', count: 1, lastSeen: T2, scriptId: null },
    ];
    expect(sortWeakWords(list).map((w) => w.word)).toEqual(['c', 'd', 'a', 'b']);
  });
});
