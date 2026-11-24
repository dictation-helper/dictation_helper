import type { PracticeRecord, Script, Settings, StoredData } from '../types';

export const CURRENT_SCHEMA_VERSION = 2;

export function emptyData(): StoredData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    scripts: [],
    settings: { rate: null, voiceURI: null },
    records: [],
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
  };
}

/** v1 -> v2: adds an empty practice record list. Scripts and settings are kept as they are. */
export function migrateV1toV2(v1: Record<string, unknown>): Record<string, unknown> {
  return { ...v1, schemaVersion: 2, records: [] };
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
  // Data without a version is treated like v1 (same shape).
  const data = version < 2 ? migrateV1toV2(raw) : raw;
  const scripts = Array.isArray(data.scripts)
    ? data.scripts.map(sanitizeScript).filter((s): s is Script => s !== null)
    : [];
  const records = Array.isArray(data.records)
    ? data.records.map(sanitizeRecord).filter((r): r is PracticeRecord => r !== null)
    : [];
  return { schemaVersion: CURRENT_SCHEMA_VERSION, scripts, settings: sanitizeSettings(data.settings), records };
}
