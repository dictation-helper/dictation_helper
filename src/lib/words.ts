export interface Token {
  text: string;
  start: number;
  end: number;
  wordLike: boolean;
}

export function tokenize(text: string, locale?: string): Token[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const seg = new Intl.Segmenter(locale, { granularity: 'word' });
      return Array.from(seg.segment(text), (s) => ({
        text: s.segment,
        start: s.index,
        end: s.index + s.segment.length,
        wordLike: Boolean(s.isWordLike),
      }));
    } catch {
      // fall through
    }
  }
  const tokens: Token[] = [];
  for (const m of text.matchAll(/\s+|\S+/g)) {
    const start = m.index ?? 0;
    tokens.push({ text: m[0], start, end: start + m[0].length, wordLike: /\S/.test(m[0]) });
  }
  return tokens;
}

/** Index of the word-like token that contains charIndex (or the next word after it). */
export function findTokenIndex(tokens: readonly Token[], charIndex: number): number {
  return tokens.findIndex((t) => t.wordLike && charIndex < t.end);
}
