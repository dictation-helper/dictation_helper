export interface VoiceLike {
  name: string;
  lang: string;
  voiceURI: string;
  default: boolean;
}

/** "ko_kr" / "KO-kr" -> "ko-KR" */
export function canonicalLang(lang: string): string {
  const parts = lang.replace(/_/g, '-').split('-').filter(Boolean);
  if (parts.length === 0) return '';
  return parts
    .map((p, i) => (i === 0 ? p.toLowerCase() : p.length === 2 ? p.toUpperCase() : p))
    .join('-');
}

export function primaryLang(lang: string): string {
  return canonicalLang(lang).split('-')[0] ?? '';
}

/** Unique, sorted language tags offered by the installed voices. */
export function listLangs(voices: readonly VoiceLike[]): string[] {
  return Array.from(new Set(voices.map((v) => canonicalLang(v.lang)).filter(Boolean))).sort();
}

/** lang with a region ("ko-KR") matches exactly; a bare tag ("ko") matches the language. */
export function filterVoices<T extends VoiceLike>(voices: readonly T[], lang: string | null): T[] {
  if (!lang) return [...voices];
  const want = canonicalLang(lang);
  if (want.includes('-')) return voices.filter((v) => canonicalLang(v.lang) === want);
  return voices.filter((v) => primaryLang(v.lang) === want);
}

export function pickVoice<T extends VoiceLike>(candidates: readonly T[], voiceURI: string | null): T | null {
  if (candidates.length === 0) return null;
  return (
    candidates.find((v) => v.voiceURI === voiceURI) ?? candidates.find((v) => v.default) ?? candidates[0]
  );
}

export function langLabel(lang: string): string {
  try {
    const name = new Intl.DisplayNames(['ko'], { type: 'language' }).of(lang);
    return name && name !== lang ? `${name} (${lang})` : lang;
  } catch {
    return lang;
  }
}
