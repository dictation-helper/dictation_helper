import { langLabel } from '../../lib/voices';
import type { PlaybackStatus } from '../../hooks/useSpeechSynthesis';
import styles from './TTSControls.module.css';

interface Props {
  status: PlaybackStatus;
  repeating: boolean;
  hasText: boolean;
  langChoice: string;
  detectedLang: string | null;
  langs: string[];
  voices: SpeechSynthesisVoice[];
  voiceURI: string | null;
  rate: number | null;
  onLangChange: (v: string) => void;
  onVoiceChange: (uri: string) => void;
  onRateChange: (v: number) => void;
  onPlayAll: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function TTSControls(p: Props) {
  const idle = p.status === 'idle';
  return (
    <section className={styles.bar} aria-label="읽기 컨트롤">
      <div className={styles.row}>
        {idle && <button type="button" className="primary" onClick={p.onPlayAll} disabled={!p.hasText}>전체 재생</button>}
        {p.status === 'playing' && <button type="button" onClick={p.onPause}>일시정지</button>}
        {p.status === 'paused' && <button type="button" className="primary" onClick={p.onResume}>이어서 재생</button>}
        <button type="button" onClick={p.onStop} disabled={idle}>정지</button>
        {p.repeating && <span className={styles.badge}>문장 반복 중</span>}
        {p.status === 'paused' && <span className={styles.badge}>일시정지됨</span>}
      </div>
      <div className={styles.row}>
        <label className={styles.field}>
          <span>언어</span>
          <select value={p.langChoice} onChange={(e) => p.onLangChange(e.target.value)}>
            <option value="auto">자동 감지{p.detectedLang ? ` (${langLabel(p.detectedLang)})` : ''}</option>
            {p.langs.map((l) => (
              <option key={l} value={l}>{langLabel(l)}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>목소리</span>
          <select value={p.voiceURI ?? ''} onChange={(e) => p.onVoiceChange(e.target.value)} disabled={p.voices.length === 0}>
            {p.voices.length === 0 && <option value="">사용 가능한 목소리 없음</option>}
            {p.voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>속도 {(p.rate ?? 1).toFixed(1)}배</span>
          <input type="range" min={0.5} max={2} step={0.1} value={p.rate ?? 1} onChange={(e) => p.onRateChange(Number(e.target.value))} />
        </label>
      </div>
    </section>
  );
}
