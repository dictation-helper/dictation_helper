import { describe, expect, it } from 'vitest';
import { computeWpm, countWords } from './wpm';

describe('countWords', () => {
  it('counts English words and ignores punctuation', () => {
    expect(countWords('Hello, world! This is a test.', 'en')).toBe(6);
  });
  it('returns 0 for empty or whitespace-only text', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('  \n\t ')).toBe(0);
  });
  it('counts space-separated Korean words', () => {
    expect(countWords('안녕하세요 반갑습니다', 'ko')).toBeGreaterThanOrEqual(2);
  });
  it('gives a non-zero, plausible count for Japanese and Chinese without spaces', () => {
    const ja = countWords('今日は天気です。', 'ja');
    const zh = countWords('你好，世界。', 'zh');
    expect(ja).toBeGreaterThan(0);
    expect(zh).toBeGreaterThan(0);
    expect(ja).toBeLessThanOrEqual(8);
    expect(zh).toBeLessThanOrEqual(6);
  });
});

describe('computeWpm', () => {
  it('computes words per minute', () => {
    expect(computeWpm(120, 60_000)).toBe(120);
    expect(computeWpm(50, 30_000)).toBe(100);
    expect(computeWpm(90, 90_000)).toBe(60);
  });
  it('guards zero, negative and NaN input', () => {
    expect(computeWpm(10, 0)).toBeNull();
    expect(computeWpm(0, 1000)).toBeNull();
    expect(computeWpm(10, -5)).toBeNull();
    expect(computeWpm(NaN, 1000)).toBeNull();
    expect(computeWpm(10, NaN)).toBeNull();
    expect(computeWpm(10, Infinity)).toBeNull();
  });
});
