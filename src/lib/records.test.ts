import { describe, expect, it } from 'vitest';
import { formatDateKeyKo, groupByDate, localDateKey } from './records';
import type { PracticeRecord } from '../types';

function rec(id: string, date: Date): PracticeRecord {
  return { id, scriptId: null, scriptTitle: '', date: date.toISOString(), elapsedMs: 1000, targetMs: null, toleranceSec: null, wordCount: 1, wpm: 60 };
}

describe('groupByDate', () => {
  it('groups by local date, newest first', () => {
    const a = rec('a', new Date(2026, 10, 24, 9, 0));
    const b = rec('b', new Date(2026, 10, 24, 18, 0));
    const c = rec('c', new Date(2026, 10, 23, 12, 0));
    const groups = groupByDate([a, c, b]);
    expect(groups.map((g) => g.dateKey)).toEqual(['2026-11-24', '2026-11-23']);
    expect(groups[0].records.map((r) => r.id)).toEqual(['b', 'a']);
    expect(groups[1].records.map((r) => r.id)).toEqual(['c']);
  });
  it('handles empty input and bad dates', () => {
    expect(groupByDate([])).toEqual([]);
    expect(localDateKey('nope')).toBe('');
  });
});

describe('formatDateKeyKo', () => {
  it('formats keys', () => {
    expect(formatDateKeyKo('2026-11-04')).toBe('2026년 11월 4일');
    expect(formatDateKeyKo('')).toBe('날짜 없음');
  });
});
