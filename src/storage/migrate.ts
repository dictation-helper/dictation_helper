import type { PracticeRecord, Script, Settings, StoredData, WeakWord } from '../types';

export const CURRENT_SCHEMA_VERSION = 3;

export function emptyData(): StoredData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    scripts: [],
    settings: { rate: null, voiceURI: null },
    records: [],
    weakWords: [],
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function sanitizeScript(v: unknown): Script | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== 'string' || typeof v.text !== 'string') return null;
  return {
    id: v.id,
    title: typeof v.title === 'string' ? v.title : '',
    text: v.text,
    lang: typeof v.lang === 'string' ? v.lang : 'auto',
    createdAt: typeof v.createdAt === 'number' ? v.createdAt : 0,
    updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : 0,
  };
}

function sanitizeSettings(v: unknown): Settings {
  const s = isRecord(v) ? v : {};
  return {
    rate: typeof s.rate === 'number' && Number.isFinite(s.rate) ? s.rate : null,
    voiceURI: typeof s.voiceURI === 'string' ? s.voiceURI : null,
  };
}

function nullableNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

function sanitizeRecord(v: unknown): PracticeRecord | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== 'string' || typeof v.date !== 'string' || Number.isNaN(Date.parse(v.date))) return null;
  const elapsedMs = nullableNumber(v.elapsedMs);
  if (elapsedMs === null) return null;
  return {
    id: v.id,
    scriptId: typeof v.scriptId === 'string' ? v.scriptId : null,
    scriptTitle: typeof v.scriptTitle === 'string' ? v.scriptTitle : '',
    date: v.date,
    elapsedMs,
    targetMs: nullableNumber(v.targetMs),
    toleranceSec: nullableNumber(v.toleranceSec),
    wordCount: nullableNumber(v.wordCount) ?? 0,
    wpm: nullableNumber(v.wpm),
    durationSource: v.durationSource === 'recording' ? 'recording' : 'stopwatch',
  };
}

function sanitizeWeakWord(v: unknown): WeakWord | null {
  if (!isRecord(v)) return null;
  if (typeof v.word !== 'string' || v.word === '') return null;
  if (typeof v.lastSeen !== 'string' || Number.isNaN(Date.parse(v.lastSeen))) return null;
  const count = nullableNumber(v.count);
  if (count === null || count < 1) return null;
  return { word: v.word, count: Math.floor(count), lastSeen: v.lastSeen, scriptId: typeof v.scriptId === 'string' ? v.scriptId : null };
}

/** v1 -> v2: adds an empty practice record list. Scripts and settings are kept as they are. */
export function migrateV1toV2(v1: Record<string, unknown>): Record<string, unknown> {
  return { ...v1, schemaVersion: 2, records: [] };
}

/**
 * v2 -> v3: adds the weak word list and a durationSource on every record.
 * Records written before v3 always used the stopwatch.
 */
export function migrateV2toV3(v2: Record<string, unknown>): Record<string, unknown> {
  const records = Array.isArray(v2.records)
    ? v2.records.map((r) => (isRecord(r) ? { ...r, durationSource: 'stopwatch' } : r))
    : [];
  return { ...v2, schemaVersion: 3, records, weakWords: [] };
}

/**
 * Brings stored data up to CURRENT_SCHEMA_VERSION.
 * Returns null when the data was written by a newer app version (must not be overwritten).
 * Add a step per version bump here.
 */
export function migrate(raw: unknown): StoredData | null {
  if (!isRecord(raw)) return emptyData();
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  if (version > CURRENT_SCHEMA_VERSION) return null;
  let data: Record<string, unknown> = raw;
  // Data without a version is treated like v1 (same shape).
  if (version < 2) data = migrateV1toV2(data);
  if (version < 3) data = migrateV2toV3(data);
  const scripts = Array.isArray(data.scripts)
    ? data.scripts.map(sanitizeScript).filter((s): s is Script => s !== null)
    : [];
  const records = Array.isArray(data.records)
    ? data.records.map(sanitizeRecord).filter((r): r is PracticeRecord => r !== null)
    : [];
  const weakWords = Array.isArray(data.weakWords)
    ? data.weakWords.map(sanitizeWeakWord).filter((w): w is WeakWord => w !== null)
    : [];
  return { schemaVersion: CURRENT_SCHEMA_VERSION, scripts, settings: sanitizeSettings(data.settings), records, weakWords };
}
