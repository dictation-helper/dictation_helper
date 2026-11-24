import { useMemo, useState } from 'react';
import { useTimer } from '../../hooks/useTimer';
import { compareToTarget, formatClock, formatDurationKo, parseTargetMs, parseToleranceSec, progressRatio } from '../../lib/timing';
import { computeWpm, countWords } from '../../lib/wpm';
import type { PracticeRecord } from '../../types';
import { VerdictText } from './VerdictText';
import styles from './Timer.module.css';

interface Props {
  scriptId: string | null;
  scriptTitle: string;
  text: string;
  locale?: string;
  onSaveRecord: (draft: Omit<PracticeRecord, 'id' | 'date'>) => void;
}

const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 4);

export function Timer({ scriptId, scriptTitle, text, locale, onSaveRecord }: Props) {
  const { status, elapsedMs, start, pause, reset } = useTimer();
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [tolerance, setTolerance] = useState('');
  const [savedElapsed, setSavedElapsed] = useState<number | null>(null);

  const targetMs = parseTargetMs(minutes, seconds);
  const toleranceSec = targetMs === null ? null : parseToleranceSec(tolerance);
  const wordCount = useMemo(() => countWords(text, locale), [text, locale]);
  const stopped = status === 'paused';
  const wpm = stopped ? computeWpm(wordCount, elapsedMs) : null;
  const saved = stopped && savedElapsed === elapsedMs;

  const ratio = targetMs === null ? 0 : progressRatio(elapsedMs, targetMs);
  const percent = Math.round(ratio * 100);
  const targetSec = targetMs === null ? 0 : Math.round(targetMs / 1000);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const comparison = stopped && targetMs !== null ? compareToTarget(elapsedMs, targetMs, toleranceSec) : null;

  const onSave = () => {
    onSaveRecord({
      scriptId,
      scriptTitle,
      elapsedMs: Math.round(elapsedMs),
      targetMs,
      toleranceSec,
      wordCount,
      wpm: wpm === null ? null : Math.round(wpm * 10) / 10,
      durationSource: 'stopwatch',
    });
    setSavedElapsed(elapsedMs);
  };

  return (
    <div className={styles.timer}>
      <fieldset className={styles.targets}>
        <legend>목표 시간 (비워 두면 스톱워치만 사용)</legend>
        <label className={styles.field}>
          <span>분</span>
          <input type="text" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(digitsOnly(e.target.value))} />
        </label>
        <label className={styles.field}>
          <span>초</span>
          <input type="text" inputMode="numeric" value={seconds} onChange={(e) => setSeconds(digitsOnly(e.target.value))} />
        </label>
        <label className={styles.field}>
          <span>허용 오차 ± 초</span>
          <input type="text" inputMode="numeric" value={tolerance} onChange={(e) => setTolerance(digitsOnly(e.target.value))} />
        </label>
      </fieldset>

      <div className={styles.clock} role="timer" aria-label="경과 시간">
        {formatClock(elapsedMs)}
      </div>

      <div className={styles.buttons}>
        {status === 'running' ? (
          <button type="button" className="primary" onClick={pause} aria-label="스톱워치 일시정지">일시정지</button>
        ) : (
          <button type="button" className="primary" onClick={start} aria-label={status === 'paused' ? '스톱워치 이어서 시작' : '스톱워치 시작'}>
            {status === 'paused' ? '이어서' : '시작'}
          </button>
        )}
        <button type="button" onClick={reset} disabled={status === 'idle'} aria-label="스톱워치 초기화">초기화</button>
      </div>

      {targetMs !== null && (
        <div className={styles.progressBlock}>
          <div
            className={styles.bar}
            role="progressbar"
            aria-label="목표 시간 대비 진행률"
            aria-valuemin={0}
            aria-valuemax={targetSec}
            aria-valuenow={Math.min(elapsedSec, targetSec)}
            aria-valuetext={`목표 ${formatClock(targetMs)} 중 ${formatClock(elapsedMs)} (${percent}%)`}
          >
            <div className={styles.fill} style={{ width: `${percent}%` }} />
          </div>
          <p className={styles.numbers}>
            {formatClock(elapsedMs)} / {formatClock(targetMs)} ({percent}%)
            {elapsedMs > targetMs && ' · 목표 시간 초과'}
          </p>
        </div>
      )}

      {stopped && (
        <div className={styles.result} aria-live="polite">
          <p className={styles.line}>측정 시간: {formatClock(elapsedMs)}</p>
          {comparison && (
            <p className={styles.line}>
              {comparison.direction === 'same' ? '목표와 같음' : `목표보다 ${formatDurationKo(comparison.diffSec)} ${comparison.direction === 'faster' ? '빠름' : '느림'}`}
            </p>
          )}
          {comparison && toleranceSec !== null && <VerdictText within={comparison.withinTolerance === true} toleranceSec={toleranceSec} />}
          <p className={styles.line}>
            {wpm === null
              ? '속도(WPM): 대본에 단어가 없어 계산할 수 없습니다.'
              : `속도: 분당 약 ${Math.round(wpm)}단어 (단어 ${wordCount}개)`}
          </p>
          <button type="button" onClick={onSave} disabled={saved} aria-label="연습 기록 저장">
            {saved ? '저장됨' : '기록 저장'}
          </button>
        </div>
      )}
    </div>
  );
}
