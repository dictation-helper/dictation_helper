/** Elapsed time from timestamps, so it stays correct when ticks are throttled or skipped. */
export function elapsedAt(accumulatedMs: number, startedAt: number | null, now: number): number {
  if (startedAt === null) return accumulatedMs;
  return accumulatedMs + Math.max(0, now - startedAt);
}

/** Parses a non-negative integer typed by the user. Empty or invalid input gives null. */
export function parseNonNegInt(input: string): number | null {
  const s = input.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

/** Target time in ms from minute and second fields. null when both are empty, invalid or zero. */
export function parseTargetMs(minutes: string, seconds: string): number | null {
  if (!minutes.trim() && !seconds.trim()) return null;
  const m = minutes.trim() ? parseNonNegInt(minutes) : 0;
  const s = seconds.trim() ? parseNonNegInt(seconds) : 0;
  if (m === null || s === null) return null;
  const total = (m * 60 + s) * 1000;
  return total > 0 ? total : null;
}

export function parseToleranceSec(input: string): number | null {
  return parseNonNegInt(input);
}

/** "m:ss" (minutes are not capped). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Korean duration text such as "1분 5초" or "12초". */
export function formatDurationKo(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}초`;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
}

export function progressRatio(elapsedMs: number, targetMs: number): number {
  if (!(targetMs > 0) || !Number.isFinite(elapsedMs)) return 0;
  return Math.min(1, Math.max(0, elapsedMs / targetMs));
}

export interface TargetComparison {
  /** Whole seconds, always >= 0. */
  diffSec: number;
  direction: 'faster' | 'slower' | 'same';
  /** null when no tolerance was entered. */
  withinTolerance: boolean | null;
}

/**
 * Compares elapsed time with the target. The difference is rounded to whole seconds first
 * so the verdict always matches the number shown to the user.
 */
export function compareToTarget(elapsedMs: number, targetMs: number, toleranceSec: number | null): TargetComparison {
  const signed = Math.round((elapsedMs - targetMs) / 1000);
  const diffSec = Math.abs(signed);
  return {
    diffSec,
    direction: signed < 0 ? 'faster' : signed > 0 ? 'slower' : 'same',
    withinTolerance: toleranceSec === null ? null : diffSec <= toleranceSec,
  };
}
