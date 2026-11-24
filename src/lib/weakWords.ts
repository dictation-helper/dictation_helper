import type { WeakWord } from '../types';

export function weakWordKey(w: Pick<WeakWord, 'word' | 'scriptId'>): string {
  return `${w.scriptId ?? ''}\u0000${w.word}`;
}

/**
 * Adds one take's missing/substituted words. Each distinct word counts once per take.
 * Returns a new list; the input is not modified.
 */
export function mergeWeakWords(
  existing: readonly WeakWord[],
  words: readonly string[],
  scriptId: string | null,
  nowIso: string,
): WeakWord[] {
  const unique = Array.from(new Set(words.filter((w) => w !== '')));
  const byKey = new Map(existing.map((w) => [weakWordKey(w), w] as const));
  for (const word of unique) {
    const key = weakWordKey({ word, scriptId });
    const prev = byKey.get(key);
    byKey.set(key, prev ? { ...prev, count: prev.count + 1, lastSeen: nowIso } : { word, count: 1, lastSeen: nowIso, scriptId });
  }
  return Array.from(byKey.values());
}

/** Most frequent first; ties go to the most recently seen, then alphabetical. */
export function sortWeakWords(list: readonly WeakWord[]): WeakWord[] {
  return [...list].sort(
    (a, b) => b.count - a.count || Date.parse(b.lastSeen) - Date.parse(a.lastSeen) || a.word.localeCompare(b.word),
  );
}
