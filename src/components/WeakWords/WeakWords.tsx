import { useState } from 'react';
import { sortWeakWords, weakWordKey } from '../../lib/weakWords';
import type { Script, WeakWord } from '../../types';
import styles from './WeakWords.module.css';

interface Props {
  words: WeakWord[];
  scripts: Script[];
  ttsSupported: boolean;
  speaking: boolean;
  onSpeakOne: (word: string) => void;
  onLoop: (words: string[]) => void;
  onStop: () => void;
  onRemove: (w: WeakWord) => void;
  onClear: () => void;
}

export function WeakWords({ words, scripts, ttsSupported, speaking, onSpeakOne, onLoop, onStop, onRemove, onClear }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const sorted = sortWeakWords(words);
  if (sorted.length === 0) {
    return <p className={styles.empty}>아직 모인 단어가 없습니다. 녹음 결과에서 &quot;자주 틀리는 단어에 반영&quot;을 누르면 여기에 쌓입니다.</p>;
  }
  const titleOf = (id: string | null) => (id === null ? '저장 안 한 대본' : scripts.find((s) => s.id === id)?.title || (scripts.some((s) => s.id === id) ? '제목 없음' : '삭제된 대본'));

  return (
    <div className={styles.wrap}>
      {!ttsSupported && <p className={styles.empty}>이 브라우저는 음성 읽기를 지원하지 않아 듣기 버튼을 쓸 수 없습니다.</p>}
      <div className={styles.top}>
        {speaking ? (
          <button type="button" className="primary" onClick={onStop} aria-label="단어 읽기 멈추기">읽기 멈추기</button>
        ) : (
          <button type="button" className="primary" onClick={() => onLoop(sorted.map((w) => w.word))} disabled={!ttsSupported} aria-label="모은 단어를 모아서 반복 연습">모아서 반복 연습</button>
        )}
        {confirmClear ? (
          <>
            <button type="button" className="danger" onClick={() => { onClear(); setConfirmClear(false); }} aria-label="자주 틀리는 단어 전체 삭제 확인">정말 전체 삭제</button>
            <button type="button" onClick={() => setConfirmClear(false)}>취소</button>
          </>
        ) : (
          <button type="button" className="danger" onClick={() => setConfirmClear(true)} aria-label="자주 틀리는 단어 전체 삭제">전체 삭제</button>
        )}
      </div>
      <ul className={styles.list}>
        {sorted.map((w) => (
          <li key={weakWordKey(w)} className={styles.item}>
            <div className={styles.body}>
              <strong className={styles.word}>{w.word}</strong>
              <span className={styles.meta}> · {w.count}회 · 마지막 {new Date(w.lastSeen).toLocaleDateString()} · {titleOf(w.scriptId)}</span>
            </div>
            <div className={styles.actions}>
              <button type="button" onClick={() => onSpeakOne(w.word)} disabled={!ttsSupported} aria-label={`${w.word} 이 단어 듣기`}>이 단어 듣기</button>
              <button type="button" className="danger" onClick={() => onRemove(w)} aria-label={`${w.word} 삭제`}>삭제</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
