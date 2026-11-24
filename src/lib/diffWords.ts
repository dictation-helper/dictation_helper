import { primaryLang } from './voices';
import { tokenize } from './words';

export type DiffKind = 'match' | 'missing' | 'substituted' | 'extra';

export interface DiffToken {
  kind: DiffKind;
  /**
   * match: the script word. missing: the script word that was not heard.
   * substituted: the script word that was replaced. extra: the word that was heard but not in the script.
   */
  text: string;
  /** substituted only: what was heard instead. */
  heard?: string;
}

export type DiffMode = 'word' | 'char';

export interface DiffResult {
  mode: DiffMode;
  tokens: DiffToken[];
}

export interface DiffSummary {
  match: number;
  missing: number;
  substituted: number;
  extra: number;
  /** Share of script tokens that were matched (0..1); null when the script is empty. */
  accuracy: number | null;
}

interface Item {
  /** Form shown to the user. */
  display: string;
  /** Form used for comparison. */
  norm: string;
}

const SPACELESS_LANGS = new Set(['ja', 'zh', 'th', 'lo', 'km', 'my']);
const SPACELESS_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/gu;
const LETTER = /[\p{L}\p{N}]/gu;

/** Case, width (NFKC) and punctuation insensitive form used for comparison. */
export function normalizeToken(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '');
}

/** Languages written without spaces between words are compared character by character. */
export function detectDiffMode(script: string, locale?: string): DiffMode {
  if (locale && SPACELESS_LANGS.has(primaryLang(locale))) return 'char';
  const letters = script.normalize('NFKC').match(LETTER)?.length ?? 0;
  if (letters === 0) return 'word';
  const spaceless = script.normalize('NFKC').match(SPACELESS_SCRIPT)?.length ?? 0;
  return spaceless / letters >= 0.5 ? 'char' : 'word';
}

function toItems(text: string, mode: DiffMode, locale?: string): Item[] {
  const items: Item[] = [];
  if (mode === 'char') {
    for (const ch of text.normalize('NFKC')) {
      const norm = normalizeToken(ch);
      if (norm) items.push({ display: ch, norm });
    }
    return items;
  }
  for (const t of tokenize(text, locale)) {
    if (!t.wordLike) continue;
    const norm = normalizeToken(t.text);
    if (norm) items.push({ display: t.text, norm });
  }
  return items;
}

/** Upper bound on DP cells; keeps memory near 16MB however long the input is. */
const MAX_CELLS = 4_000_000;

type Op = 'match' | 'del' | 'ins';

/**
 * LCS alignment of a (script) against b (heard) with a banded DP.
 * The band follows the diagonal from (0,0) to (n,m) and is wide enough to cover the whole
 * table for normal inputs, so the result is exact there. For very long inputs the band is
 * narrowed to keep memory bounded, which can only miss alignments far from the diagonal.
 */
function align(a: readonly string[], b: readonly string[]): Op[] {
  const n = a.length;
  const m = b.length;
  if (n === 0) return b.map(() => 'ins');
  if (m === 0) return a.map(() => 'del');

  const minHalf = Math.ceil(m / n) + 2;
  const budgetHalf = Math.floor((MAX_CELLS / (n + 1) - 1) / 2);
  const half = Math.max(minHalf, Math.min(budgetHalf, Math.max(n, m)));
  const width = 2 * half + 1;
  const center = (i: number) => Math.round((i * m) / n);
  const lo = (i: number) => center(i) - half;

  const dp = new Int32Array((n + 1) * width).fill(-1);
  const get = (i: number, j: number): number => {
    if (j < 0 || j > m) return -1;
    const k = j - lo(i);
    return k < 0 || k >= width ? -1 : dp[i * width + k];
  };

  for (let i = 0; i <= n; i++) {
    const start = Math.max(0, lo(i));
    const end = Math.min(m, lo(i) + width - 1);
    for (let j = start; j <= end; j++) {
      let best: number;
      if (i === 0) {
        best = 0;
      } else {
        best = Math.max(get(i - 1, j), j > 0 ? get(i, j - 1) : -1);
        if (j > 0 && a[i - 1] === b[j - 1]) {
          const diag = get(i - 1, j - 1);
          if (diag >= 0) best = Math.max(best, diag + 1);
        }
      }
      dp[i * width + (j - lo(i))] = best;
    }
  }

  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const cur = get(i, j);
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && get(i - 1, j - 1) + 1 === cur) {
      ops.push('match');
      i--;
      j--;
    } else if (i > 0 && get(i - 1, j) === cur) {
      ops.push('del');
      i--;
    } else if (j > 0) {
      ops.push('ins');
      j--;
    } else {
      ops.push('del');
      i--;
    }
  }
  return ops.reverse();
}

/**
 * Word-level (or character-level for spaceless languages) diff between the script and the
 * recognized text. Punctuation is dropped from the output tokens.
 */
export function diffScript(script: string, heard: string, locale?: string): DiffResult {
  const mode = detectDiffMode(script, locale);
  const a = toItems(script, mode, locale);
  const b = toItems(heard, mode, locale);

  // Trim the common prefix and suffix so the DP only sees the part that differs.
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre].norm === b[pre].norm) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf].norm === b[b.length - 1 - suf].norm) suf++;
  const aMid = a.slice(pre, a.length - suf);
  const bMid = b.slice(pre, b.length - suf);

  const tokens: DiffToken[] = a.slice(0, pre).map((it) => ({ kind: 'match', text: it.display }));
  const ops = align(aMid.map((x) => x.norm), bMid.map((x) => x.norm));

  let ai = 0;
  let bi = 0;
  let k = 0;
  while (k < ops.length) {
    if (ops[k] === 'match') {
      tokens.push({ kind: 'match', text: aMid[ai].display });
      ai++;
      bi++;
      k++;
      continue;
    }
    // A run of deletions/insertions between two matches: pair them up as substitutions.
    const dels: Item[] = [];
    const inss: Item[] = [];
    while (k < ops.length && ops[k] !== 'match') {
      if (ops[k] === 'del') dels.push(aMid[ai++]);
      else inss.push(bMid[bi++]);
      k++;
    }
    const pairs = Math.min(dels.length, inss.length);
    for (let p = 0; p < pairs; p++) tokens.push({ kind: 'substituted', text: dels[p].display, heard: inss[p].display });
    for (const d of dels.slice(pairs)) tokens.push({ kind: 'missing', text: d.display });
    for (const x of inss.slice(pairs)) tokens.push({ kind: 'extra', text: x.display });
  }

  for (const it of a.slice(a.length - suf)) tokens.push({ kind: 'match', text: it.display });
  return { mode, tokens };
}

export function summarizeDiff(tokens: readonly DiffToken[]): DiffSummary {
  const count = (kind: DiffKind) => tokens.filter((t) => t.kind === kind).length;
  const match = count('match');
  const missing = count('missing');
  const substituted = count('substituted');
  const scriptTokens = match + missing + substituted;
  return { match, missing, substituted, extra: count('extra'), accuracy: scriptTokens === 0 ? null : match / scriptTokens };
}

/**
 * Script words that were missing or substituted, in normalized form, for the weak word list.
 * Only word mode gives useful entries; single characters are not collected.
 */
export function collectWeakWords(result: DiffResult): string[] {
  if (result.mode !== 'word') return [];
  return result.tokens
    .filter((t) => t.kind === 'missing' || t.kind === 'substituted')
    .map((t) => normalizeToken(t.text))
    .filter((w) => w !== '');
}
