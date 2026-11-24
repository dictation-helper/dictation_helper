import { useState } from 'react';
import { formatDateKeyKo, groupByDate } from '../../lib/records';
import { compareToTarget, formatClock, formatDurationKo } from '../../lib/timing';
import type { PracticeRecord } from '../../types';
import styles from './PracticeHistory.module.css';

interface Props {
  records: PracticeRecord[];
  onDelete: (id: string) => void;
}

function describeTarget(r: PracticeRecord): string | null {
  if (r.targetMs === null) return null;
  const c = compareToTarget(r.elapsedMs, r.targetMs, r.toleranceSec);
  const diff = c.direction === 'same' ? '목표와 같음' : `목표보다 ${formatDurationKo(c.diffSec)} ${c.direction === 'faster' ? '빠름' : '느림'}`;
  const tol = c.withinTolerance === null ? '' : c.withinTolerance ? ` · ✓ 허용 범위 안 (±${r.toleranceSec}초)` : ` · ✗ 허용 범위 밖 (±${r.toleranceSec}초)`;
  return `목표 ${formatClock(r.targetMs)} · ${diff}${tol}`;
}

export function PracticeHistory({ records, onDelete }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const groups = groupByDate(records);

  if (groups.length === 0) return <p className={styles.empty}>저장된 연습 기록이 없습니다.</p>;

  return (
    <div className={styles.history}>
      {groups.map((g) => (
        <section key={g.dateKey || 'unknown'} aria-label={formatDateKeyKo(g.dateKey)}>
          <h3 className={styles.date}>{formatDateKeyKo(g.dateKey)}</h3>
          <ul className={styles.list}>
            {g.records.map((r) => {
              const name = r.scriptTitle || '제목 없음';
              const time = new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const target = describeTarget(r);
              return (
                <li key={r.id} className={styles.item}>
                  <div className={styles.body}>
                    <div className={styles.name}>
                      {name}
                      <span className={styles.meta}> · {time}{r.scriptId === null ? ' · 저장 안 한 대본' : ''}</span>
                    </div>
                    <div className={styles.meta}>
                      측정 {formatClock(r.elapsedMs)}
                      {r.wpm === null ? ' · WPM 계산 불가' : ` · 분당 약 ${Math.round(r.wpm)}단어 (${r.wordCount}개)`}
                    </div>
                    {target && <div className={styles.meta}>{target}</div>}
                  </div>
                  {confirmId === r.id ? (
                    <div className={styles.actions}>
                      <button type="button" className="danger" onClick={() => { onDelete(r.id); setConfirmId(null); }} aria-label={`${name} ${time} 기록 삭제 확인`}>정말 삭제</button>
                      <button type="button" onClick={() => setConfirmId(null)}>취소</button>
                    </div>
                  ) : (
                    <button type="button" className="danger" onClick={() => setConfirmId(r.id)} aria-label={`${name} ${time} 기록 삭제`}>삭제</button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
