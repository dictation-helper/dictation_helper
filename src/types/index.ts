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
}
