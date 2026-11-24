import type { PracticeRecord } from '../types';

export interface DateGroup {
  /** Local date as YYYY-MM-DD. */
  dateKey: string;
  records: PracticeRecord[];
}

export function localDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Groups records by local date. Newest date first, newest record first inside a group. */
export function groupByDate(records: readonly PracticeRecord[]): DateGroup[] {
  const sorted = [...records].sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || 0);
  const groups: DateGroup[] = [];
  for (const r of sorted) {
    const key = localDateKey(r.date);
    const last = groups[groups.length - 1];
    if (last && last.dateKey === key) last.records.push(r);
    else groups.push({ dateKey: key, records: [r] });
  }
  return groups;
}

export function formatDateKeyKo(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  return m ? `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일` : '날짜 없음';
}
