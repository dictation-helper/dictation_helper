import { useCallback, useEffect, useState } from 'react';
import { elapsedAt } from '../lib/timing';

export type TimerStatus = 'idle' | 'running' | 'paused';

interface State {
  accMs: number;
  startedAt: number | null;
  now: number;
}

/**
 * Stopwatch based on timestamp deltas (performance.now), not tick counting.
 * The interval only triggers re-renders, so throttled or hidden tabs stay accurate.
 */
export function useTimer(tickMs = 200) {
  const [s, setS] = useState<State>({ accMs: 0, startedAt: null, now: 0 });
  const running = s.startedAt !== null;

  useEffect(() => {
    if (!running) return;
    const update = () => setS((p) => (p.startedAt === null ? p : { ...p, now: performance.now() }));
    const id = window.setInterval(update, tickMs);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, [running, tickMs]);

  const start = useCallback(() => {
    const t = performance.now();
    setS((p) => (p.startedAt !== null ? p : { ...p, startedAt: t, now: t }));
  }, []);

  const pause = useCallback(() => {
    const t = performance.now();
    setS((p) => (p.startedAt === null ? p : { accMs: elapsedAt(p.accMs, p.startedAt, t), startedAt: null, now: t }));
  }, []);

  const reset = useCallback(() => setS({ accMs: 0, startedAt: null, now: 0 }), []);

  const elapsedMs = elapsedAt(s.accMs, s.startedAt, s.now);
  const status: TimerStatus = running ? 'running' : s.accMs > 0 ? 'paused' : 'idle';
  return { status, elapsedMs, start, pause, reset };
}
