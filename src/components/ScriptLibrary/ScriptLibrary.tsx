import { useState } from 'react';
import type { Script } from '../../types';
import styles from './ScriptLibrary.module.css';

interface Props {
  scripts: Script[];
  currentId: string | null;
  onLoad: (s: Script) => void;
  onDelete: (id: string) => void;
}

export function ScriptLibrary({ scripts, currentId, onLoad, onDelete }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const sorted = [...scripts].sort((a, b) => b.updatedAt - a.updatedAt);

  if (sorted.length === 0) return <p className={styles.empty}>저장된 대본이 없습니다.</p>;

  return (
    <ul className={styles.list}>
      {sorted.map((s) => {
        const name = s.title || '제목 없음';
        return (
          <li key={s.id} className={`${styles.item} ${s.id === currentId ? styles.current : ''}`}>
            <div className={styles.name}>
              {name}
              {s.id === currentId && <span className={styles.meta}> · 현재 대본</span>}
              <div className={styles.meta}>{new Date(s.updatedAt).toLocaleString()}</div>
            </div>
            <div className={styles.actions}>
              <button type="button" onClick={() => onLoad(s)} aria-label={`${name} 불러오기`}>불러오기</button>
              {confirmId === s.id ? (
                <>
                  <button type="button" className="danger" onClick={() => { onDelete(s.id); setConfirmId(null); }} aria-label={`${name} 삭제 확인`}>정말 삭제</button>
                  <button type="button" onClick={() => setConfirmId(null)}>취소</button>
                </>
              ) : (
                <button type="button" className="danger" onClick={() => setConfirmId(s.id)} aria-label={`${name} 삭제`}>삭제</button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
