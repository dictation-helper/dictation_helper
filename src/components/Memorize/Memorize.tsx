import { useMemo, useState } from 'react';
import { LEVEL_LABELS, MASK_LEVELS, maskScript, type MaskLevel, type MaskToken } from '../../lib/mask';
import type { Paragraph } from '../../lib/segment';
import styles from './Memorize.module.css';

interface Props {
  paragraphs: Paragraph[];
  locale: string | undefined;
  level: MaskLevel;
  keywords: string[];
  /** true when the keywords are saved with the script (false for an unsaved draft) */
  keywordsPersisted: boolean;
  onLevelChange: (l: MaskLevel) => void;
  onToggleKeyword: (key: string) => void;
  onClearKeywords: () => void;
}

const LEVEL_HELP: Record<MaskLevel, string> = {
  full: '모든 단어가 보입니다. 이 단계에서 단어를 눌러 키워드로 고르세요.',
  first: '각 문장의 첫 단어만 보이고 나머지는 가려집니다.',
  keywords: '고른 키워드만 보입니다. 같은 단어는 모든 곳에서 보입니다.',
  hidden: '모든 단어가 가려집니다. 문장 부호만 남습니다.',
};

interface WordProps {
  token: MaskToken;
  pickable: boolean;
  isKeyword: boolean;
  onToggle: (key: string) => void;
}

function Word({ token, pickable, isKeyword, onToggle }: WordProps) {
  if (!token.isWord || !token.visible) return null;
  const mark = isKeyword ? <span className={styles.star} aria-hidden="true">★</span> : null;
  if (pickable) {
    return (
      <button
        type="button"
        className={`${styles.wordBtn} ${isKeyword ? styles.keyword : ''}`}
        aria-pressed={isKeyword}
        aria-label={`키워드 ${isKeyword ? '해제' : '선택'}: ${token.text}`}
        onClick={() => onToggle(token.key)}
      >
        {mark}
        {token.text}
      </button>
    );
  }
  return (
    <span className={isKeyword ? styles.keyword : undefined}>
      {mark}
      {token.text}
    </span>
  );
}

export function Memorize({ paragraphs, locale, level, keywords, keywordsPersisted, onLevelChange, onToggleKeyword, onClearKeywords }: Props) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const keywordSet = useMemo(() => new Set(keywords), [keywords]);
  const masked = useMemo(() => maskScript(paragraphs, level, keywordSet, locale), [paragraphs, level, keywordSet, locale]);

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className={styles.memorize}>
      <fieldset className={styles.levels}>
        <legend>가리기 단계</legend>
        {MASK_LEVELS.map((l, i) => (
          <label key={l} className={`${styles.level} ${l === level ? styles.levelOn : ''}`}>
            <input type="radio" name="mask-level" value={l} checked={l === level} onChange={() => onLevelChange(l)} />
            <span>{i + 1}단계 · {LEVEL_LABELS[l]}</span>
          </label>
        ))}
      </fieldset>
      <p className={styles.help}>{LEVEL_HELP[level]}</p>
      <p className={styles.help}>
        키워드 {keywords.length}개{keywords.length > 0 && `: ${keywords.join(', ')}`}
        {!keywordsPersisted && keywords.length > 0 && ' (대본을 저장하면 함께 저장됩니다)'}
        {keywords.length > 0 && (
          <button type="button" className={styles.small} onClick={onClearKeywords} aria-label="키워드 모두 지우기">모두 지우기</button>
        )}
      </p>

      {paragraphs.map((p, pIdx) => (
        <section key={pIdx} className={styles.paragraph} aria-label={`문단 ${pIdx + 1}`}>
          {p.sentences.map((_, sIdx) => {
            const id = `${pIdx}-${sIdx}`;
            const isRevealed = revealed.has(id);
            const tokens = masked[pIdx][sIdx];
            const pickable = level === 'full' || isRevealed;
            return (
              <div key={id} className={styles.sentence}>
                <button
                  type="button"
                  className={styles.peek}
                  aria-pressed={isRevealed}
                  aria-label={`문단 ${pIdx + 1} 문장 ${sIdx + 1} ${isRevealed ? '다시 가리기' : '잠깐 보기'}`}
                  onClick={() => toggleReveal(id)}
                  disabled={level === 'full'}
                >
                  {isRevealed ? '가리기' : '보기'}
                </button>
                <p className={styles.text}>
                  {tokens.map((t, i) => {
                    if (!t.isWord) return <span key={i}>{t.text}</span>;
                    const show = t.visible || isRevealed;
                    if (!show) {
                      return (
                        <span key={i} className={styles.blank} role="img" aria-label="가려진 단어">
                          <span aria-hidden="true">{'＿'.repeat(Math.min(Math.max(1, Array.from(t.text).length), 8))}</span>
                        </span>
                      );
                    }
                    return (
                      <Word
                        key={i}
                        token={{ ...t, visible: true }}
                        pickable={pickable}
                        isKeyword={keywordSet.has(t.key)}
                        onToggle={onToggleKeyword}
                      />
                    );
                  })}
                </p>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
