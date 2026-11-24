import { memo, useMemo, useRef } from 'react';
import { useScrollIntoView } from '../../hooks/useScrollIntoView';
import type { FlatScript, Paragraph } from '../../lib/segment';
import { findTokenIndex, tokenize } from '../../lib/words';
import styles from './ScriptView.module.css';

interface SentenceTextProps {
  text: string;
  locale: string | undefined;
  charIndex: number | null;
}

const SentenceText = memo(function SentenceText({ text, locale, charIndex }: SentenceTextProps) {
  const tokens = useMemo(() => tokenize(text, locale), [text, locale]);
  const activeToken = charIndex === null ? -1 : findTokenIndex(tokens, charIndex);
  return (
    <>
      {tokens.map((t, i) => (
        <span key={t.start} className={`${styles.word} ${i === activeToken ? styles.wordActive : ''}`}>{t.text}</span>
      ))}
    </>
  );
});

interface SentenceRowProps {
  text: string;
  index: number;
  locale: string | undefined;
  active: boolean;
  repeatingThis: boolean;
  charIndex: number | null;
  onPlayOnce: (index: number) => void;
  onRepeat: (index: number) => void;
}

function SentenceRow({ text, index, locale, active, repeatingThis, charIndex, onPlayOnce, onRepeat }: SentenceRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollIntoView(ref, active);
  return (
    <div ref={ref} className={`${styles.sentence} ${active ? styles.sentenceActive : ''}`} aria-current={active ? 'true' : undefined}>
      <button type="button" className={styles.once} onClick={() => onPlayOnce(index)} aria-label={`문장 ${index + 1} 한 번 재생`} title="한 번 재생">▶</button>
      <button
        type="button"
        className={styles.text}
        onClick={() => onRepeat(index)}
        aria-pressed={repeatingThis}
        aria-label={`문장 ${index + 1} 반복 재생 ${repeatingThis ? '끄기' : '켜기'}: ${text}`}
        title="클릭하면 이 문장을 반복 재생합니다"
      >
        <SentenceText text={text} locale={locale} charIndex={active ? charIndex : null} />
      </button>
    </div>
  );
}

interface Props {
  paragraphs: Paragraph[];
  flat: FlatScript;
  locale: string | undefined;
  activeIndex: number | null;
  charIndex: number | null;
  repeating: boolean;
  onPlayParagraph: (pIdx: number) => void;
  onPlayOnce: (index: number) => void;
  onRepeat: (index: number) => void;
}

export function ScriptView({ paragraphs, flat, locale, activeIndex, charIndex, repeating, onPlayParagraph, onPlayOnce, onRepeat }: Props) {
  return (
    <div className={styles.view}>
      <p className={styles.hint}>▶ 버튼은 한 문장을 한 번, 문장을 클릭하면 그 문장을 반복해서 읽어 줍니다. 다시 클릭하면 반복을 끝냅니다.</p>
      {paragraphs.map((p, pIdx) => (
        <section key={pIdx} className={styles.paragraph} aria-label={`문단 ${pIdx + 1}`}>
          <div className={styles.pHead}>
            <span className={styles.pTitle}>문단 {pIdx + 1}</span>
            <button type="button" onClick={() => onPlayParagraph(pIdx)} aria-label={`문단 ${pIdx + 1} 재생`}>문단 재생</button>
          </div>
          {p.sentences.map((text, sIdx) => {
            const index = flat.ranges[pIdx].from + sIdx;
            return (
              <SentenceRow
                key={index}
                text={text}
                index={index}
                locale={locale}
                active={activeIndex === index}
                repeatingThis={repeating && activeIndex === index}
                charIndex={charIndex}
                onPlayOnce={onPlayOnce}
                onRepeat={onRepeat}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}
