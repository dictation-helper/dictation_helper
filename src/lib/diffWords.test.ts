import { describe, expect, it } from 'vitest';
import { collectWeakWords, detectDiffMode, diffScript, normalizeToken, summarizeDiff, type DiffToken } from './diffWords';

const kinds = (tokens: DiffToken[]) => tokens.map((t) => t.kind);

describe('normalizeToken', () => {
  it('ignores case, punctuation and full-width forms', () => {
    expect(normalizeToken('Hello,')).toBe('hello');
    expect(normalizeToken('ＡＢＣ１２３')).toBe('abc123');
    expect(normalizeToken('"don\'t"')).toBe('dont');
    expect(normalizeToken('！？。')).toBe('');
  });
});

describe('detectDiffMode', () => {
  it('uses characters for Japanese and Chinese, words otherwise', () => {
    expect(detectDiffMode('今日は天気です。')).toBe('char');
    expect(detectDiffMode('你好，世界')).toBe('char');
    expect(detectDiffMode('안녕하세요 반갑습니다')).toBe('word');
    expect(detectDiffMode('Hello world')).toBe('word');
    expect(detectDiffMode('')).toBe('word');
  });
  it('trusts a spaceless locale even for short text', () => {
    expect(detectDiffMode('abc', 'ja-JP')).toBe('char');
  });
});

describe('diffScript English', () => {
  it('marks identical text as all matches', () => {
    const r = diffScript('The quick brown fox.', 'the QUICK brown fox', 'en');
    expect(r.mode).toBe('word');
    expect(kinds(r.tokens)).toEqual(['match', 'match', 'match', 'match']);
  });
  it('finds a missing word', () => {
    const r = diffScript('I like green apples', 'I like apples', 'en');
    expect(r.tokens.map((t) => [t.kind, t.text])).toEqual([['match', 'I'], ['match', 'like'], ['missing', 'green'], ['match', 'apples']]);
  });
  it('finds an extra word', () => {
    const r = diffScript('I like apples', 'I really like apples', 'en');
    expect(r.tokens.map((t) => [t.kind, t.text])).toEqual([['match', 'I'], ['extra', 'really'], ['match', 'like'], ['match', 'apples']]);
  });
  it('finds a substitution and keeps what was heard', () => {
    const r = diffScript('I like apples', 'I like oranges', 'en');
    expect(r.tokens[2]).toEqual({ kind: 'substituted', text: 'apples', heard: 'oranges' });
  });
  it('pairs unequal runs as substitution plus leftover', () => {
    const r = diffScript('a b c d', 'a x y z d', 'en');
    expect(kinds(r.tokens)).toEqual(['match', 'substituted', 'substituted', 'extra', 'match']);
  });
});

describe('diffScript other languages', () => {
  it('works for Korean words', () => {
    const r = diffScript('저는 오늘 발표를 합니다', '저는 오늘 발표를 했습니다', 'ko');
    expect(r.mode).toBe('word');
    expect(kinds(r.tokens)).toEqual(['match', 'match', 'match', 'substituted']);
    expect(r.tokens[3]).toMatchObject({ text: '합니다', heard: '했습니다' });
  });
  it('compares Japanese by character', () => {
    const r = diffScript('今日は天気です。', '今日は雨です', 'ja');
    expect(r.mode).toBe('char');
    expect(r.tokens.map((t) => t.kind)).toEqual(['match', 'match', 'match', 'substituted', 'missing', 'match', 'match']);
    expect(r.tokens[3]).toMatchObject({ text: '天', heard: '雨' });
    expect(r.tokens.some((t) => t.kind === 'missing')).toBe(true);
  });
  it('compares Chinese by character and ignores full-width punctuation', () => {
    const r = diffScript('你好，世界！', '你好世界');
    expect(r.mode).toBe('char');
    expect(kinds(r.tokens)).toEqual(['match', 'match', 'match', 'match']);
  });
  it('detects a missing Chinese character', () => {
    const r = diffScript('我爱你们', '我爱们');
    expect(r.tokens.map((t) => [t.kind, t.text])).toEqual([['match', '我'], ['match', '爱'], ['missing', '你'], ['match', '们']]);
  });
});

describe('edge cases', () => {
  it('handles empty inputs', () => {
    expect(diffScript('', '', 'en').tokens).toEqual([]);
    expect(kinds(diffScript('a b', '', 'en').tokens)).toEqual(['missing', 'missing']);
    expect(kinds(diffScript('', 'a b', 'en').tokens)).toEqual(['extra', 'extra']);
  });
  it('treats punctuation-only input as empty', () => {
    expect(diffScript('...', '!!', 'en').tokens).toEqual([]);
  });
  it('marks everything wrong when nothing matches', () => {
    const r = diffScript('one two three', 'four five six', 'en');
    expect(kinds(r.tokens)).toEqual(['substituted', 'substituted', 'substituted']);
    const s = summarizeDiff(r.tokens);
    expect(s).toMatchObject({ match: 0, substituted: 3, accuracy: 0 });
  });
  it('summarizes counts and accuracy', () => {
    const s = summarizeDiff(diffScript('a b c d', 'a c d e', 'en').tokens);
    expect(s).toEqual({ match: 3, missing: 1, substituted: 0, extra: 1, accuracy: 0.75 });
    expect(summarizeDiff([]).accuracy).toBeNull();
  });
});

describe('collectWeakWords', () => {
  it('collects normalized missing and substituted words only', () => {
    const r = diffScript('Hello, World again today', 'hello earth today', 'en');
    expect(collectWeakWords(r).sort()).toEqual(['again', 'world']);
  });
  it('collects nothing in character mode', () => {
    expect(collectWeakWords(diffScript('今日は天気です', '今日は雨です', 'ja'))).toEqual([]);
  });
});

describe('long input', () => {
  const words = Array.from({ length: 6000 }, (_, i) => `w${i}`);

  it('aligns a long script with a few errors quickly and exactly', () => {
    const heard = words.filter((_, i) => i !== 100 && i !== 3000).map((w, i) => (i === 4000 ? 'zzz' : w));
    const t0 = performance.now();
    const r = diffScript(words.join(' '), heard.join(' '), 'en');
    expect(performance.now() - t0).toBeLessThan(5000);
    const s = summarizeDiff(r.tokens);
    expect(s.missing).toBe(2);
    expect(s.substituted).toBe(1);
    expect(s.extra).toBe(0);
  });
  it('stays bounded when everything differs', () => {
    const other = words.map((_, i) => `x${i}`);
    const t0 = performance.now();
    const r = diffScript(words.join(' '), other.join(' '), 'en');
    expect(performance.now() - t0).toBeLessThan(5000);
    expect(summarizeDiff(r.tokens)).toMatchObject({ match: 0, substituted: 6000 });
  });
  it('handles a much shorter take than the script', () => {
    const r = diffScript(words.join(' '), words.slice(0, 500).join(' '), 'en');
    const s = summarizeDiff(r.tokens);
    expect(s.match).toBe(500);
    expect(s.missing).toBe(5500);
  });
  it('handles long Japanese text by character', () => {
    const script = '今日は天気です。'.repeat(1500);
    const heard = '今日は天気です。'.repeat(1499) + '今日は雨です。';
    const r = diffScript(script, heard, 'ja');
    expect(r.mode).toBe('char');
    expect(summarizeDiff(r.tokens).substituted).toBe(1);
  });
});
