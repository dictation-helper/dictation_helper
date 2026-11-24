import { describe, expect, it } from 'vitest';
import { detectLang } from './detectLang';
import { flattenScript, segmentScript, splitParagraphs, splitSentences, splitSentencesRegex } from './segment';
import { findTokenIndex, tokenize } from './words';
import { filterVoices, listLangs, pickVoice, canonicalLang } from './voices';
import { migrate, emptyData } from '../storage/migrate';

describe('detectLang', () => {
  it('detects by script', () => {
    expect(detectLang('Hello world')).toBe('en');
    expect(detectLang('안녕하세요 반갑습니다')).toBe('ko');
    expect(detectLang('こんにちは世界')).toBe('ja');
    expect(detectLang('你好，世界')).toBe('zh');
    expect(detectLang('Привет мир')).toBe('ru');
  });
  it('keeps the main script when foreign words are mixed in', () => {
    expect(detectLang('오늘은 presentation 을 합니다')).toBe('ko');
  });
  it('returns null without letters', () => {
    expect(detectLang('')).toBeNull();
    expect(detectLang('123 !!!')).toBeNull();
  });
});

describe('segmentation', () => {
  it('splits paragraphs on blank lines', () => {
    expect(splitParagraphs('a\n\n\nb\r\n\r\nc')).toEqual(['a', 'b', 'c']);
    expect(splitParagraphs('   \n\n  ')).toEqual([]);
  });
  it('splits sentences in several languages', () => {
    expect(splitSentences('Hello there. How are you? Fine!', 'en')).toEqual(['Hello there.', 'How are you?', 'Fine!']);
    expect(splitSentences('안녕하세요. 만나서 반갑습니다.', 'ko')).toEqual(['안녕하세요.', '만나서 반갑습니다.']);
    expect(splitSentences('今日は天気です。明日は雨です。', 'ja')).toEqual(['今日は天気です。', '明日は雨です。']);
    expect(splitSentences('你好。再见！', 'zh')).toEqual(['你好。', '再见！']);
  });
  it('treats single newlines as sentence boundaries', () => {
    expect(splitSentences('first line\nsecond line')).toEqual(['first line', 'second line']);
  });
  it('regex fallback does not split decimals', () => {
    expect(splitSentencesRegex('Pi is 3.14 roughly. Next one.')).toEqual(['Pi is 3.14 roughly.', 'Next one.']);
    expect(splitSentencesRegex('끝났다。다음')).toEqual(['끝났다。', '다음']);
  });
  it('flattens with paragraph ranges', () => {
    const flat = flattenScript(segmentScript('A. B.\n\nC.', 'en'));
    expect(flat.items.map((i) => i.text)).toEqual(['A.', 'B.', 'C.']);
    expect(flat.ranges).toEqual([{ from: 0, to: 1 }, { from: 2, to: 2 }]);
    expect(flat.items[2]).toMatchObject({ pIdx: 1, sIdx: 0, index: 2 });
  });
});

describe('words', () => {
  it('tokenizes and finds the token at a char index', () => {
    const tokens = tokenize('Hello big world', 'en');
    const words = tokens.filter((t) => t.wordLike).map((t) => t.text);
    expect(words).toEqual(['Hello', 'big', 'world']);
    expect(tokens[findTokenIndex(tokens, 0)].text).toBe('Hello');
    expect(tokens[findTokenIndex(tokens, 6)].text).toBe('big');
    expect(tokens[findTokenIndex(tokens, 5)].text).toBe('big'); // on the space -> next word
    expect(findTokenIndex(tokens, 99)).toBe(-1);
  });
  it('works without spaces', () => {
    const tokens = tokenize('今日は天気です', 'ja');
    expect(tokens.map((t) => t.text).join('')).toBe('今日は天気です');
  });
});

describe('voices', () => {
  const v = (name: string, lang: string, def = false) => ({ name, lang, voiceURI: name, default: def });
  const voices = [v('A', 'en_US'), v('B', 'en-GB', true), v('C', 'ko-KR')];
  it('canonicalizes and lists langs', () => {
    expect(canonicalLang('en_us')).toBe('en-US');
    expect(listLangs(voices)).toEqual(['en-GB', 'en-US', 'ko-KR']);
  });
  it('filters by primary or full tag', () => {
    expect(filterVoices(voices, 'en').map((x) => x.name)).toEqual(['A', 'B']);
    expect(filterVoices(voices, 'en-GB').map((x) => x.name)).toEqual(['B']);
    expect(filterVoices(voices, 'th')).toEqual([]);
    expect(filterVoices(voices, null)).toHaveLength(3);
  });
  it('picks saved, then default, then first', () => {
    const en = filterVoices(voices, 'en');
    expect(pickVoice(en, 'A')?.name).toBe('A');
    expect(pickVoice(en, 'zzz')?.name).toBe('B');
    expect(pickVoice([], null)).toBeNull();
  });
});

describe('storage migrate', () => {
  it('returns empty data for junk', () => {
    expect(migrate(null)).toEqual(emptyData());
    expect(migrate('x')).toEqual(emptyData());
  });
  it('sanitizes scripts and settings', () => {
    const out = migrate({ schemaVersion: 1, scripts: [{ id: 'a', text: 't' }, { bad: true }], settings: { rate: 'x' } });
    expect(out?.scripts).toHaveLength(1);
    expect(out?.scripts[0]).toMatchObject({ id: 'a', title: '', lang: 'auto' });
    expect(out?.settings).toEqual({ rate: null, voiceURI: null });
  });
  it('refuses data from a newer version', () => {
    expect(migrate({ schemaVersion: 999 })).toBeNull();
  });
});
