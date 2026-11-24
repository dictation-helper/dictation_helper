import { detectDiffMode, normalizeToken } from './diffWords';
import type { Paragraph } from './segment';
import { tokenize } from './words';

/** full: everything visible, first: first word of each sentence, keywords: chosen words, hidden: nothing. */
export type MaskLevel = 'full' | 'first' | 'keywords' | 'hidden';

export const MASK_LEVELS: readonly MaskLevel[] = ['full', 'first', 'keywords', 'hidden'];

export interface MaskToken {
  text: string;
  /** A real word (or character) that can be hidden or picked as a keyword. */
  isWord: boolean;
  /** Normalized form used as the keyword key; '' for non-words. */
  key: string;
  visible: boolean;
}

export interface TokenizeOptions {
  /** Test hook: pretend Intl.Segmenter is missing. */
  segmenter?: boolean;
}

interface RawToken {
  text: string;
  wordLike: boolean;
}

function hasSegmenter(): boolean {
  return typeof Intl !== 'undefined' && 'Segmenter' in Intl;
}

/**
 * Word tokens via Intl.Segmenter. Without it, text in spaceless languages (ja/zh/...) falls back
 * to single characters, and other text to whitespace-separated chunks.
 */
function rawTokens(sentence: string, locale: string | undefined, opts: TokenizeOptions): RawToken[] {
  const segmenter = opts.segmenter ?? hasSegmenter();
  if (segmenter) return tokenize(sentence, locale).map((t) => ({ text: t.text, wordLike: t.wordLike }));
  if (detectDiffMode(sentence, locale) === 'char') {
    return Array.from(sentence, (ch) => ({ text: ch, wordLike: /[\p{L}\p{N}]/u.test(ch) }));
  }
  return Array.from(sentence.matchAll(/\s+|\S+/g), (m) => ({ text: m[0], wordLike: /\S/.test(m[0]) }));
}

/** Keyword key of a word; case, punctuation and width insensitive, survives text edits. */
export function keywordKey(word: string): string {
  return normalizeToken(word);
}

/**
 * Visibility of every token in one sentence. Whitespace and punctuation always stay visible.
 */
export function maskSentence(
  sentence: string,
  level: MaskLevel,
  keywords: ReadonlySet<string>,
  locale?: string,
  opts: TokenizeOptions = {},
): MaskToken[] {
  let firstSeen = false;
  return rawTokens(sentence, locale, opts).map((t) => {
    const key = t.wordLike ? keywordKey(t.text) : '';
    if (key === '') return { text: t.text, isWord: false, key: '', visible: true };
    let visible: boolean;
    switch (level) {
      case 'full':
        visible = true;
        break;
      case 'first':
        visible = !firstSeen;
        break;
      case 'keywords':
        visible = keywords.has(key);
        break;
      case 'hidden':
        visible = false;
        break;
    }
    firstSeen = true;
    return { text: t.text, isWord: true, key, visible };
  });
}

/** result[paragraph][sentence] = tokens */
export function maskScript(
  paragraphs: readonly Paragraph[],
  level: MaskLevel,
  keywords: ReadonlySet<string>,
  locale?: string,
  opts: TokenizeOptions = {},
): MaskToken[][][] {
  return paragraphs.map((p) => p.sentences.map((s) => maskSentence(s, level, keywords, locale, opts)));
}

/** Adds the key when missing, removes it when present. Returns a new array without duplicates. */
export function toggleKeyword(keywords: readonly string[], key: string): string[] {
  if (key === '') return [...keywords];
  return keywords.includes(key) ? keywords.filter((k) => k !== key) : [...keywords, key];
}

export const LEVEL_LABELS: Record<MaskLevel, string> = {
  full: '전체 보기',
  first: '첫 단어만',
  keywords: '키워드만',
  hidden: '전부 숨김',
};
