import { describe, expect, it } from 'vitest';
import {
  compareToTarget, elapsedAt, formatClock, formatDurationKo, parseNonNegInt, parseTargetMs, parseToleranceSec, progressRatio,
} from './timing';

describe('elapsedAt', () => {
  it('uses timestamp deltas, not tick counts', () => {
    expect(elapsedAt(0, 1000, 61_000)).toBe(60_000);
    expect(elapsedAt(5000, 1000, 4000)).toBe(8000);
  });
  it('returns the accumulated time when stopped', () => {
    expect(elapsedAt(7000, null, 999_999)).toBe(7000);
  });
  it('never goes backwards', () => {
    expect(elapsedAt(100, 5000, 4000)).toBe(100);
  });
});

describe('parsing', () => {
  it('parses non-negative integers only', () => {
    expect(parseNonNegInt('12')).toBe(12);
    expect(parseNonNegInt(' 0 ')).toBe(0);
    expect(parseNonNegInt('')).toBeNull();
    expect(parseNonNegInt('-1')).toBeNull();
    expect(parseNonNegInt('1.5')).toBeNull();
    expect(parseNonNegInt('abc')).toBeNull();
  });
  it('has no default target', () => {
    expect(parseTargetMs('', '')).toBeNull();
    expect(parseTargetMs(' ', '')).toBeNull();
    expect(parseToleranceSec('')).toBeNull();
  });
  it('builds a target from minutes and seconds', () => {
    expect(parseTargetMs('2', '30')).toBe(150_000);
    expect(parseTargetMs('2', '')).toBe(120_000);
    expect(parseTargetMs('', '45')).toBe(45_000);
    expect(parseTargetMs('0', '0')).toBeNull();
    expect(parseTargetMs('x', '5')).toBeNull();
  });
});

describe('formatting', () => {
  it('formats the clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65_900)).toBe('1:05');
    expect(formatClock(3_600_000)).toBe('60:00');
  });
  it('formats Korean durations', () => {
    expect(formatDurationKo(12)).toBe('12초');
    expect(formatDurationKo(60)).toBe('1분');
    expect(formatDurationKo(75)).toBe('1분 15초');
  });
});

describe('progressRatio', () => {
  it('clamps to 0..1 and guards bad input', () => {
    expect(progressRatio(30_000, 60_000)).toBe(0.5);
    expect(progressRatio(90_000, 60_000)).toBe(1);
    expect(progressRatio(-5, 60_000)).toBe(0);
    expect(progressRatio(1000, 0)).toBe(0);
    expect(progressRatio(NaN, 1000)).toBe(0);
  });
});

describe('compareToTarget', () => {
  it('reports faster and slower', () => {
    expect(compareToTarget(48_000, 60_000, null)).toEqual({ diffSec: 12, direction: 'faster', withinTolerance: null });
    expect(compareToTarget(72_000, 60_000, null)).toEqual({ diffSec: 12, direction: 'slower', withinTolerance: null });
  });
  it('reports same when equal after rounding', () => {
    expect(compareToTarget(60_400, 60_000, 0)).toEqual({ diffSec: 0, direction: 'same', withinTolerance: true });
  });
  it('checks the tolerance inclusively', () => {
    expect(compareToTarget(65_000, 60_000, 5).withinTolerance).toBe(true);
    expect(compareToTarget(66_000, 60_000, 5).withinTolerance).toBe(false);
    expect(compareToTarget(54_000, 60_000, 5).withinTolerance).toBe(false);
  });
});
