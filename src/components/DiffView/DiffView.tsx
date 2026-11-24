import type { DiffResult, DiffSummary } from '../../lib/diffWords';
import { SpeechNotice } from '../Recorder/SpeechNotice';
import styles from './DiffView.module.css';

interface Props {
  result: DiffResult;
  summary: DiffSummary;
  heardText: string;
  weakCount: number;
  weakApplied: boolean;
  onApplyWeak: () => void;
  saveDisabled: boolean;
  /** Memorize level that was active when the take was recorded. */
  levelLabel?: string;
}

export function DiffView({ result, summary, heardText, weakCount, weakApplied, onApplyWeak, saveDisabled, levelLabel }: Props) {
  const sep = result.mode === 'word' ? ' ' : '';
  const percent = summary.accuracy === null ? null : Math.round(summary.accuracy * 100);
  return (
    <div className={styles.diff}>
      <SpeechNotice short />
      {levelLabel && <p className={styles.note}>외우기 단계: {levelLabel} (비교는 항상 원래 대본 전체 기준)</p>}
      <p className={styles.summary}>
        일치 {summary.match} · 빠진 {summary.missing} · 바뀐 {summary.substituted} · 추가 {summary.extra}
        {percent !== null && ` · 일치율 ${percent}%`}
        {result.mode === 'char' && ' (띄어쓰기가 없는 언어라 글자 단위로 비교했습니다)'}
      </p>

      <ul className={styles.legend} aria-label="표시 설명">
        <li><del className={styles.missing}>단어</del><span className={styles.tag}>빠짐</span> 대본에 있는데 인식되지 않음</li>
        <li><u className={styles.sub}>단어</u><span className={styles.tag}>→들린 말</span> 다른 말로 인식됨</li>
        <li><ins className={styles.extra}>+단어</ins><span className={styles.tag}>추가</span> 대본에 없는데 인식됨</li>
      </ul>

      <p className={styles.text} lang={undefined}>
        {result.tokens.map((t, i) => (
          <span key={i}>
            {i > 0 && sep}
            {t.kind === 'match' && <span>{t.text}</span>}
            {t.kind === 'missing' && (
              <>
                <del className={styles.missing}>{t.text}</del>
                <span className={styles.tag}>빠짐</span>
              </>
            )}
            {t.kind === 'substituted' && (
              <>
                <u className={styles.sub}>{t.text}</u>
                <span className={styles.tag}>→{t.heard}</span>
              </>
            )}
            {t.kind === 'extra' && (
              <>
                <ins className={styles.extra}>+{t.text}</ins>
                <span className={styles.tag}>추가</span>
              </>
            )}
          </span>
        ))}
      </p>

      <details>
        <summary>인식된 문장 전체 보기</summary>
        <p className={styles.heard}>{heardText}</p>
      </details>

      <div className={styles.actions}>
        <button type="button" onClick={onApplyWeak} disabled={weakApplied || weakCount === 0 || saveDisabled} aria-label="이번 결과의 빠진 단어와 바뀐 단어를 자주 틀리는 단어에 반영">
          {weakApplied ? '자주 틀리는 단어에 반영됨' : `자주 틀리는 단어에 반영 (${weakCount}개)`}
        </button>
        {result.mode === 'char' && <span className={styles.note}>글자 단위 비교에서는 단어를 모으지 않습니다.</span>}
      </div>
    </div>
  );
}
