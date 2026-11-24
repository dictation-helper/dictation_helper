export interface Paragraph {
  sentences: string[];
}

export interface FlatSentence {
  text: string;
  /** index in the flat list of all sentences */
  index: number;
  pIdx: number;
  sIdx: number;
}

export interface FlatScript {
  items: FlatSentence[];
  /** inclusive flat index range of each paragraph */
  ranges: Array<{ from: number; to: number }>;
}

/** Paragraphs are separated by one or more blank lines. */
export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

const SENTENCE_RE = /.+?(?:[。！？…]+[」』”’)）\]]*|[.!?]+["'”’)\]]*(?=\s|$)|$)/gs;

/** Fallback used when Intl.Segmenter is unavailable. Exported for tests. */
export function splitSentencesRegex(line: string): string[] {
  return (line.match(SENTENCE_RE) ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
}

function splitLine(line: string, locale?: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const seg = new Intl.Segmenter(locale, { granularity: 'sentence' });
      return Array.from(seg.segment(line), (s) => s.segment.trim()).filter((s) => s.length > 0);
    } catch {
      // invalid locale or unsupported: fall through to the regex splitter
    }
  }
  return splitSentencesRegex(line);
}

/** Line breaks inside a paragraph are treated as sentence boundaries. */
export function splitSentences(paragraph: string, locale?: string): string[] {
  return paragraph
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .flatMap((l) => splitLine(l, locale));
}

export function segmentScript(text: string, locale?: string): Paragraph[] {
  return splitParagraphs(text)
    .map((p) => ({ sentences: splitSentences(p, locale) }))
    .filter((p) => p.sentences.length > 0);
}

export function flattenScript(paragraphs: readonly Paragraph[]): FlatScript {
  const items: FlatSentence[] = [];
  const ranges: FlatScript['ranges'] = [];
  paragraphs.forEach((p, pIdx) => {
    const from = items.length;
    p.sentences.forEach((text, sIdx) => items.push({ text, index: items.length, pIdx, sIdx }));
    ranges.push({ from, to: items.length - 1 });
  });
  return { items, ranges };
}
