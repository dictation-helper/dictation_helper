export interface Script {
  id: string;
  title: string;
  text: string;
  /** "auto" or a BCP 47 tag chosen by the user (e.g. "ko-KR"). */
  lang: string;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  /** null until the user moves the slider; then the browser default is used. */
  rate: number | null;
  voiceURI: string | null;
}

export interface StoredData {
  schemaVersion: number;
  scripts: Script[];
  settings: Settings;
  records: PracticeRecord[];
  weakWords: WeakWord[];
}

export interface PracticeRecord {
  id: string;
  /** null when the script was not saved in the library. */
  scriptId: string | null;
  scriptTitle: string;
  /** ISO 8601 timestamp of when the record was saved. */
  date: string;
  elapsedMs: number;
  targetMs: number | null;
  toleranceSec: number | null;
  wordCount: number;
  /** null when it could not be computed (no words or zero time). */
  wpm: number | null;
  /** Where elapsedMs (and the WPM) came from: the recording length or the stopwatch. */
  durationSource: 'recording' | 'stopwatch';
}

export interface WeakWord {
  /** Normalized (lowercase, no punctuation) form of the word. */
  word: string;
  /** Number of takes in which the word was missing or substituted. */
  count: number;
  /** ISO 8601 timestamp of the last take it appeared in. */
  lastSeen: string;
  /** null when the script was not saved in the library. */
  scriptId: string | null;
}
