import { tokenize } from './words';

/**
 * Counts words in a script. Uses Intl.Segmenter word granularity (isWordLike) when available,
 * which also handles Korean, Japanese and Chinese; falls back to whitespace splitting.
 */
export function countWords(text: string, locale?: string): number {
  if (!text.trim()) return 0;
  return tokenize(text, locale).filter((t) => t.wordLike).length;
}

/** Words per minute = wordCount / (elapsedSeconds / 60). Returns null when it cannot be computed. */
export function computeWpm(wordCount: number, elapsedMs: number): number | null {
  if (!Number.isFinite(wordCount) || !Number.isFinite(elapsedMs)) return null;
  if (wordCount <= 0 || elapsedMs <= 0) return null;
  const wpm = wordCount / (elapsedMs / 1000 / 60);
  return Number.isFinite(wpm) ? wpm : null;
}
