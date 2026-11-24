import { describe, expect, it } from 'vitest';
import { keywordKey, maskScript, maskSentence, toggleKeyword, type MaskToken } from './mask';
import { segmentScript } from './segment';

const none = new Set<string>();
const visibleWords = (tokens: MaskToken[]) => tokens.filter((t) => t.isWord && t.visible).map((t) => t.text);
const hiddenWords = (tokens: MaskToken[]) => tokens.filter((t) => t.isWord && !t.visible).map((t) => t.text);

describe('maskSentence levels (English)', () => {
  const s = 'The quick brown fox, again.';
  it('full shows everything', () => {
    expect(hiddenWords(maskSentence(s, 'full', none, 'en'))).toEqual([]);
  });
  it('first shows only the first word', () => {
    const t = maskSentence(s, 'first', none, 'en');
    expect(visibleWords(t)).toEqual(['The']);
    expect(hiddenWords(t)).toEqual(['quick', 'brown', 'fox', 'again']);
  });
  it('keywords shows only chosen words, case insensitively', () => {
    const t = maskSentence(s, 'keywords', new Set(['fox', 'quick']), 'en');
    expect(visibleWords(t)).toEqual(['quick', 'fox']);
  });
  it('hidden hides every word', () => {
    expect(visibleWords(maskSentence(s, 'hidden', new Set(['fox']), 'en'))).toEqual([]);
  });
  it('keeps punctuation and whitespace visible', () => {
    const t = maskSentence(s, 'hidden', none, 'en');
    const nonWords = t.filter((x) => !x.isWord);
    expect(nonWords.length).toBeGreaterThan(0);
    expect(nonWords.every((x) => x.visible)).toBe(true);
    expect(t.map((x) => x.text).join('')).toBe(s);
  });
});

describe('maskSentence other languages', () => {
  it('Korean: first word only', () => {
    const t = maskSentence('저는 오늘 발표를 합니다.', 'first', none, 'ko');
    expect(visibleWords(t)).toEqual(['저는']);
    expect(hiddenWords(t).length).toBeGreaterThanOrEqual(2);
  });
  it('Korean: keyword matches the exact word', () => {
    const t = maskSentence('저는 오늘 발표를 합니다.', 'keywords', new Set(['발표를']), 'ko');
    expect(visibleWords(t)).toEqual(['발표를']);
  });
  it('Japanese with Segmenter: hides words but keeps 。', () => {
    const t = maskSentence('今日は天気です。', 'hidden', none, 'ja');
    expect(visibleWords(t)).toEqual([]);
    expect(t.map((x) => x.text).join('')).toBe('今日は天気です。');
    expect(t.find((x) => x.text === '。')?.visible).toBe(true);
  });
  it('Chinese with Segmenter: first word only', () => {
    const t = maskSentence('你好，世界！', 'first', none, 'zh');
    expect(visibleWords(t)).toHaveLength(1);
    expect(t.map((x) => x.text).join('')).toBe('你好，世界！');
  });
  it('without Segmenter, Japanese and Chinese fall back to characters', () => {
    const ja = maskSentence('今日は天気です。', 'first', none, 'ja', { segmenter: false });
    expect(visibleWords(ja)).toEqual(['今']);
    expect(hiddenWords(ja)).toEqual(['日', 'は', '天', '気', 'で', 'す']);
    const zh = maskSentence('你好，世界！', 'keywords', new Set(['好']), 'zh', { segmenter: false });
    expect(visibleWords(zh)).toEqual(['好']);
  });
  it('without Segmenter, English falls back to whitespace chunks', () => {
    const t = maskSentence('Hello, big world.', 'first', none, 'en', { segmenter: false });
    expect(visibleWords(t)).toEqual(['Hello,']);
    expect(t.map((x) => x.text).join('')).toBe('Hello, big world.');
  });
});

describe('edge cases', () => {
  it('empty sentence and empty script', () => {
    expect(maskSentence('', 'hidden', none, 'en')).toEqual([]);
    expect(maskScript([], 'hidden', none)).toEqual([]);
    expect(maskScript(segmentScript('', 'en'), 'first', none, 'en')).toEqual([]);
  });
  it('punctuation-only sentence has no hideable words', () => {
    const t = maskSentence('...', 'hidden', none, 'en');
    expect(t.every((x) => x.visible && !x.isWord)).toBe(true);
  });
  it('no keywords selected hides everything at keywords level', () => {
    expect(visibleWords(maskSentence('one two three', 'keywords', none, 'en'))).toEqual([]);
  });
  it('a keyword shows at every occurrence', () => {
    const t = maskSentence('Apple pie and apple, APPLE!', 'keywords', new Set(['apple']), 'en');
    expect(visibleWords(t)).toEqual(['Apple', 'apple', 'APPLE']);
  });
  it('maskScript keeps paragraph/sentence structure and first word is per sentence', () => {
    const paragraphs = segmentScript('One two. Three four.\n\nFive six.', 'en');
    const out = maskScript(paragraphs, 'first', none, 'en');
    expect(out).toHaveLength(2);
    expect(out[0]).toHaveLength(2);
    expect(visibleWords(out[0][1])).toEqual(['Three']);
    expect(visibleWords(out[1][0])).toEqual(['Five']);
  });
});

describe('keywords helpers', () => {
  it('normalizes keys', () => {
    expect(keywordKey('Hello,')).toBe('hello');
    expect(keywordKey('ＡＢＣ')).toBe('abc');
    expect(keywordKey('...')).toBe('');
  });
  it('toggles without mutating or duplicating', () => {
    const base = ['a'];
    expect(toggleKeyword(base, 'b')).toEqual(['a', 'b']);
    expect(toggleKeyword(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleKeyword(base, '')).toEqual(['a']);
    expect(base).toEqual(['a']);
  });
});
