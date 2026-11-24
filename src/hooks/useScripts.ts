import { useCallback, useState } from 'react';
import { loadData, saveData } from '../storage';
import type { Script, Settings, StoredData } from '../types';
import { createId } from '../lib/id';

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
    (draft: ScriptDraft): string => {
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
      commit({ ...data, scripts });
      return id;
    },
    [data, commit],
  );

  const remove = useCallback(
    (id: string) => commit({ ...data, scripts: data.scripts.filter((s) => s.id !== id) }),
    [data, commit],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => commit({ ...data, settings: { ...data.settings, ...patch } }),
    [data, commit],
  );

  return { scripts: data.scripts, settings: data.settings, save, remove, updateSettings, saveFailed, locked };
}
