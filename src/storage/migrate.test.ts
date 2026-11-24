import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, emptyData, migrate, migrateV1toV2, migrateV2toV3 } from './migrate';

const v1 = {
  schemaVersion: 1,
  scripts: [{ id: 'a', title: 'T', text: 'hello', lang: 'en', createdAt: 1, updatedAt: 2 }],
  settings: { rate: 1.2, voiceURI: 'v' },
};

describe('migrate v1 -> v2', () => {
  it('current version is 3', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(3);
    expect(emptyData()).toMatchObject({ schemaVersion: 3, records: [], weakWords: [] });
  });
  it('keeps v1 scripts and settings and adds empty records', () => {
    const out = migrate(v1);
    expect(out).toEqual({ schemaVersion: 3, scripts: v1.scripts, settings: v1.settings, records: [], weakWords: [] });
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
  it('refuses data newer than v3', () => {
    expect(migrate({ schemaVersion: 4, scripts: [], records: [] })).toBeNull();
  });
});

describe('v2 records', () => {
  const rec = {
    id: 'r1', scriptId: null, scriptTitle: 'S', date: '2026-11-24T10:00:00.000Z',
    elapsedMs: 65000, targetMs: 60000, toleranceSec: 5, wordCount: 100, wpm: 92.3, durationSource: 'stopwatch' as const,
  };
  it('keeps valid records', () => {
    expect(migrate({ ...v1, schemaVersion: 3, records: [rec] })?.records).toEqual([rec]);
  });
  it('keeps null target and tolerance', () => {
    const r = { ...rec, targetMs: null, toleranceSec: null, wpm: null };
    expect(migrate({ ...v1, schemaVersion: 3, records: [r] })?.records).toEqual([r]);
  });
  it('drops broken records and fixes bad fields', () => {
    const out = migrate({
      ...v1,
      schemaVersion: 3,
      records: [{ id: 'x' }, null, { ...rec, date: 'nope' }, { ...rec, elapsedMs: -1 }, { ...rec, id: 'ok', targetMs: 'x', scriptId: 5 }],
    });
    expect(out?.records).toHaveLength(1);
    expect(out?.records[0]).toMatchObject({ id: 'ok', targetMs: null, scriptId: null });
  });
});

describe('migrate v2 -> v3', () => {
  const oldRec = { id: 'r1', scriptId: 's', scriptTitle: 'S', date: '2026-11-24T10:00:00.000Z', elapsedMs: 1000, targetMs: null, toleranceSec: null, wordCount: 2, wpm: 120 };
  const v2 = { schemaVersion: 2, scripts: v1.scripts, settings: v1.settings, records: [oldRec] };

  it('keeps records intact and defaults durationSource to stopwatch', () => {
    const out = migrate(v2);
    expect(out?.schemaVersion).toBe(3);
    expect(out?.records).toEqual([{ ...oldRec, durationSource: 'stopwatch' }]);
    expect(out?.scripts).toEqual(v1.scripts);
    expect(out?.settings).toEqual(v1.settings);
    expect(out?.weakWords).toEqual([]);
  });
  it('migrateV2toV3 does not touch scripts or settings', () => {
    const out = migrateV2toV3(v2);
    expect(out.scripts).toBe(v2.scripts);
    expect(out.settings).toBe(v2.settings);
    expect(out).toMatchObject({ schemaVersion: 3, weakWords: [] });
  });
  it('chains v1 -> v3', () => {
    expect(migrate(v1)).toMatchObject({ schemaVersion: 3, records: [], weakWords: [] });
  });
  it('keeps a recording durationSource and fixes invalid ones', () => {
    const out = migrate({ ...v2, schemaVersion: 3, weakWords: [], records: [{ ...oldRec, durationSource: 'recording' }, { ...oldRec, id: 'r2', durationSource: 'x' }] });
    expect(out?.records.map((r) => r.durationSource)).toEqual(['recording', 'stopwatch']);
  });
  it('sanitizes weak words', () => {
    const good = { word: 'apple', count: 2, lastSeen: '2026-11-24T10:00:00.000Z', scriptId: null };
    const out = migrate({ ...v2, schemaVersion: 3, weakWords: [good, { word: '', count: 1, lastSeen: good.lastSeen }, { ...good, count: 0 }, { ...good, lastSeen: 'x' }, null, { ...good, word: 'kiwi', scriptId: 5 }] });
    expect(out?.weakWords).toEqual([good, { ...good, word: 'kiwi', count: 2 }]);
  });
});
