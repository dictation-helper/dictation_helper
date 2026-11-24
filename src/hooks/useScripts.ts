import { useCallback, useState } from 'react';
import { loadData, saveData } from '../storage';
import type { PracticeRecord, Script, Settings, StoredData, WeakWord } from '../types';
import { createId } from '../lib/id';
import { mergeWeakWords, weakWordKey } from '../lib/weakWords';

export interface ScriptDraft {
  id: string | null;
  title: string;
  text: string;
  lang: string;
}

export function useScripts() {
  const [initial] = useState(loadData);
  const [data, setData] = useState<StoredData>(initial.data);
  const [saveFailed, setSaveFailed] = useState(false);
  const locked = initial.locked;

  const commit = useCallback(
    (next: StoredData) => {
      setData(next);
      if (locked) return;
      setSaveFailed(!saveData(next));
    },
    [locked],
  );

  /** Creates or updates a script and returns its id. */
  const save = useCallback(
    (draft: ScriptDraft, newKeywords?: readonly string[]): string => {
      const now = Date.now();
      const existing = draft.id ? data.scripts.find((s) => s.id === draft.id) : undefined;
      const id = existing?.id ?? createId();
      const script: Script = {
        id,
        title: draft.title.trim(),
        text: draft.text,
        lang: draft.lang,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      const scripts = existing ? data.scripts.map((s) => (s.id === id ? script : s)) : [...data.scripts, script];
      // Keywords picked while the script was still unsaved are stored together with the script.
      const keywords =
        newKeywords && newKeywords.length > 0 && !existing
          ? [...data.keywords, { scriptId: id, words: [...newKeywords] }]
          : data.keywords;
      commit({ ...data, scripts, keywords });
      return id;
    },
    [data, commit],
  );

  const remove = useCallback(
    (id: string) =>
      commit({
        ...data,
        scripts: data.scripts.filter((s) => s.id !== id),
        keywords: data.keywords.filter((k) => k.scriptId !== id),
      }),
    [data, commit],
  );

  const addRecord = useCallback(
    (draft: Omit<PracticeRecord, 'id' | 'date'>) =>
      commit({ ...data, records: [...data.records, { ...draft, id: createId(), date: new Date().toISOString() }] }),
    [data, commit],
  );

  const removeRecord = useCallback(
    (id: string) => commit({ ...data, records: data.records.filter((r) => r.id !== id) }),
    [data, commit],
  );

  /** Adds one take's weak words (each distinct word counts once). */
  const addWeakWords = useCallback(
    (words: readonly string[], scriptId: string | null) =>
      commit({ ...data, weakWords: mergeWeakWords(data.weakWords, words, scriptId, new Date().toISOString()) }),
    [data, commit],
  );

  const removeWeakWord = useCallback(
    (target: WeakWord) =>
      commit({ ...data, weakWords: data.weakWords.filter((w) => weakWordKey(w) !== weakWordKey(target)) }),
    [data, commit],
  );

  /** Replaces the keyword list of a saved script; an empty list removes the entry. */
  const setKeywords = useCallback(
    (scriptId: string, words: readonly string[]) => {
      const others = data.keywords.filter((k) => k.scriptId !== scriptId);
      commit({ ...data, keywords: words.length === 0 ? others : [...others, { scriptId, words: [...words] }] });
    },
    [data, commit],
  );

  const clearWeakWords = useCallback(() => commit({ ...data, weakWords: [] }), [data, commit]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => commit({ ...data, settings: { ...data.settings, ...patch } }),
    [data, commit],
  );

  return { scripts: data.scripts, settings: data.settings, records: data.records, weakWords: data.weakWords, keywords: data.keywords, setKeywords, save, remove, addRecord, removeRecord, addWeakWords, removeWeakWord, clearWeakWords, updateSettings, saveFailed, locked };
}
