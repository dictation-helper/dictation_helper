import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, emptyData, migrate, migrateV1toV2 } from './migrate';

const v1 = {
  schemaVersion: 1,
  scripts: [{ id: 'a', title: 'T', text: 'hello', lang: 'en', createdAt: 1, updatedAt: 2 }],
  settings: { rate: 1.2, voiceURI: 'v' },
};

describe('migrate v1 -> v2', () => {
  it('current version is 2', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
    expect(emptyData()).toMatchObject({ schemaVersion: 2, records: [] });
  });
  it('keeps v1 scripts and settings and adds empty records', () => {
    const out = migrate(v1);
    expect(out).toEqual({ schemaVersion: 2, scripts: v1.scripts, settings: v1.settings, records: [] });
  });
  it('migrateV1toV2 does not touch scripts or settings', () => {
    const out = migrateV1toV2(v1);
    expect(out.scripts).toBe(v1.scripts);
    expect(out.settings).toBe(v1.settings);
    expect(out).toMatchObject({ schemaVersion: 2, records: [] });
  });
  it('treats data without a version like v1', () => {
    const { schemaVersion: _omit, ...legacy } = v1;
    void _omit;
    expect(migrate(legacy)?.scripts).toHaveLength(1);
  });
  it('refuses data newer than v2', () => {
    expect(migrate({ schemaVersion: 3, scripts: [], records: [] })).toBeNull();
  });
});

describe('v2 records', () => {
  const rec = {
    id: 'r1', scriptId: null, scriptTitle: 'S', date: '2026-11-24T10:00:00.000Z',
    elapsedMs: 65000, targetMs: 60000, toleranceSec: 5, wordCount: 100, wpm: 92.3,
  };
  it('keeps valid records', () => {
    expect(migrate({ ...v1, schemaVersion: 2, records: [rec] })?.records).toEqual([rec]);
  });
  it('keeps null target and tolerance', () => {
    const r = { ...rec, targetMs: null, toleranceSec: null, wpm: null };
    expect(migrate({ ...v1, schemaVersion: 2, records: [r] })?.records).toEqual([r]);
  });
  it('drops broken records and fixes bad fields', () => {
    const out = migrate({
      ...v1,
      schemaVersion: 2,
      records: [{ id: 'x' }, null, { ...rec, date: 'nope' }, { ...rec, elapsedMs: -1 }, { ...rec, id: 'ok', targetMs: 'x', scriptId: 5 }],
    });
    expect(out?.records).toHaveLength(1);
    expect(out?.records[0]).toMatchObject({ id: 'ok', targetMs: null, scriptId: null });
  });
});
