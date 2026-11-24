import type { StoredData } from '../types';
import { emptyData, migrate } from './migrate';

const KEY = 'speech-rehearsal:data';

export interface LoadResult {
  data: StoredData;
  /** true when stored data comes from a newer app version and must not be overwritten */
  locked: boolean;
}

export function loadData(): LoadResult {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { data: emptyData(), locked: false };
    const migrated = migrate(JSON.parse(raw));
    if (migrated === null) return { data: emptyData(), locked: true };
    return { data: migrated, locked: false };
  } catch {
    return { data: emptyData(), locked: false };
  }
}

/** Returns false when the browser refuses to store (private mode, quota, disabled). */
export function saveData(data: StoredData): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
