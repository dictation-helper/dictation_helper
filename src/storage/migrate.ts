import type { Script, Settings, StoredData } from '../types';

export const CURRENT_SCHEMA_VERSION = 1;

export function emptyData(): StoredData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    scripts: [],
    settings: { rate: null, voiceURI: null },
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

/**
 * Brings stored data up to CURRENT_SCHEMA_VERSION.
 * Returns null when the data was written by a newer app version (must not be overwritten).
 * Add a case per version bump here.
 */
export function migrate(raw: unknown): StoredData | null {
  if (!isRecord(raw)) return emptyData();
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  if (version > CURRENT_SCHEMA_VERSION) return null;
  const scripts = Array.isArray(raw.scripts)
    ? raw.scripts.map(sanitizeScript).filter((s): s is Script => s !== null)
    : [];
  return { schemaVersion: CURRENT_SCHEMA_VERSION, scripts, settings: sanitizeSettings(raw.settings) };
}
