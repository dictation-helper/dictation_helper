/**
 * Very small script-based language guess. Returns a primary language subtag
 * ("ko", "ja", "zh", "ru", ...) or null when there are no letters.
 * Latin script cannot be told apart by character ranges, so it maps to "en";
 * the user can always override it with the language dropdown.
 */
export function detectLang(text: string): string | null {
  const c = { ko: 0, kana: 0, han: 0, ru: 0, ar: 0, th: 0, hi: 0, he: 0, el: 0, latin: 0 };
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if ((cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0x1100 && cp <= 0x11ff) || (cp >= 0x3130 && cp <= 0x318f)) c.ko++;
    else if (cp >= 0x3040 && cp <= 0x30ff) c.kana++;
    else if ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf)) c.han++;
    else if (cp >= 0x0400 && cp <= 0x04ff) c.ru++;
    else if (cp >= 0x0600 && cp <= 0x06ff) c.ar++;
    else if (cp >= 0x0e00 && cp <= 0x0e7f) c.th++;
    else if (cp >= 0x0900 && cp <= 0x097f) c.hi++;
    else if (cp >= 0x0590 && cp <= 0x05ff) c.he++;
    else if (cp >= 0x0370 && cp <= 0x03ff) c.el++;
    else if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a) || (cp >= 0xc0 && cp <= 0x24f)) c.latin++;
  }

  const hasKana = c.kana > 0;
  const scores: Array<[string, number]> = [
    ['ko', c.ko],
    ['ja', hasKana ? c.kana + c.han : 0],
    ['zh', hasKana ? 0 : c.han],
    ['ru', c.ru],
    ['ar', c.ar],
    ['th', c.th],
    ['hi', c.hi],
    ['he', c.he],
    ['el', c.el],
  ];
  const total = scores.reduce((sum, [, n]) => sum + n, 0) + c.latin;
  if (total === 0) return null;

  const best = scores.reduce((a, b) => (b[1] > a[1] ? b : a));
  // Foreign words inside a non-Latin script text should not flip the result.
  if (best[1] > 0 && best[1] >= total * 0.2) return best[0];
  if (c.latin > 0) return 'en';
  return best[1] > 0 ? best[0] : null;
}
