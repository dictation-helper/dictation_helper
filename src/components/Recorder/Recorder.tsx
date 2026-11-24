import { useEffect, useState } from 'react';
import type { useAlternatePlayback } from '../../hooks/useAlternatePlayback';
import type { useRecorder } from '../../hooks/useRecorder';
import type { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { formatClock } from '../../lib/timing';
import { Notice } from '../Notice/Notice';
import { SpeechNotice } from './SpeechNotice';
import styles from './Recorder.module.css';

interface Props {
  recorder: ReturnType<typeof useRecorder>;
  recognition: ReturnType<typeof useSpeechRecognition>;
  alternate: ReturnType<typeof useAlternatePlayback>;
  useRecognition: boolean;
  onUseRecognitionChange: (v: boolean) => void;
  sentences: readonly string[];
  ttsSupported: boolean;
  hasText: boolean;
  /** Called after recording actually started (used to remember the memorize level of the take). */
  onTakeStart?: () => void;
}

export function Recorder({ recorder, recognition, alternate, useRecognition, onUseRecognitionChange, sentences, ttsSupported, hasText, onTakeStart }: Props) {
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const recording = recorder.status === 'recording';
  const requesting = recorder.status === 'requesting';
  const hasTake = recorder.status === 'stopped' && recorder.url !== null;
  const recognizing = useRecognition && recognition.supported;

  // Recognition follows the recorder (also when the recorder stopped by itself, e.g. hidden tab).
  const { listening, stop: stopRecognition } = recognition;
  useEffect(() => {
    if (!recording && listening) stopRecognition();
  }, [recording, listening, stopRecognition]);

  const onStart = async () => {
    alternate.stop();
    const started = await recorder.start();
    if (started) onTakeStart?.();
    if (started && recognizing) recognition.start();
  };
  const onStop = () => {
    recorder.stop();
    recognition.stop();
  };
  const onClear = () => {
    alternate.stop();
    recorder.reset();
    recognition.reset();
  };

  const safeIdx = Math.min(sentenceIdx, Math.max(0, sentences.length - 1));
  const chosen = sentences[safeIdx];

  return (
    <div className={styles.recorder}>
      <SpeechNotice />
      {!recorder.supported && (
        <Notice kind="warn">이 브라우저는 녹음(MediaRecorder, 마이크 접근)을 지원하지 않아 녹음 기능을 사용할 수 없습니다. 다른 기능은 그대로 쓸 수 있습니다.</Notice>
      )}
      {recorder.supported && !recognition.supported && (
        <Notice kind="warn">이 브라우저는 음성 인식을 지원하지 않아 대본과 비교할 수 없습니다. 녹음과 다시 듣기는 사용할 수 있습니다.</Notice>
      )}
      {recorder.error && <Notice kind="error">{recorder.error}</Notice>}
      {recorder.notice && <Notice kind="warn">{recorder.notice}</Notice>}
      {recognition.error && <Notice kind="warn">{recognition.error}</Notice>}

      {recognition.supported && (
        <label className={styles.check}>
          <input type="checkbox" checked={useRecognition} onChange={(e) => onUseRecognitionChange(e.target.checked)} disabled={recording} />
          <span>음성 인식으로 대본과 비교 (켜면 크롬에서는 녹음하는 음성이 구글 서버로 전송됩니다. 기본은 꺼짐)</span>
        </label>
      )}

      <div className={styles.clock} role="timer" aria-label="녹음 시간">{formatClock(recorder.elapsedMs)}</div>
      <div className={styles.buttons}>
        {recording ? (
          <button type="button" className="primary" onClick={onStop} aria-label="녹음 멈추기">녹음 멈추기</button>
        ) : (
          <button type="button" className="primary" onClick={onStart} disabled={!recorder.supported || requesting}>
            {requesting ? '마이크 확인 중…' : hasTake ? '다시 녹음' : '녹음 시작'}
          </button>
        )}
        <button type="button" onClick={onClear} disabled={recorder.status === 'idle'} aria-label="녹음 지우기">녹음 지우기</button>
      </div>
      {recording && recognition.supported && useRecognition && recognition.interim && (
        <p className={styles.interim} aria-live="off">듣는 중: {recognition.interim}</p>
      )}

      {hasTake && recorder.url && (
        <div className={styles.take}>
          {/* Native controls keep playback keyboard accessible. */}
          <audio controls src={recorder.url} aria-label="내 녹음 다시 듣기" className={styles.audio} />

          <div className={styles.alt}>
            <label className={styles.select}>
              <span>번갈아 들을 문장</span>
              <select value={safeIdx} onChange={(e) => setSentenceIdx(Number(e.target.value))} disabled={!hasText || alternate.phase !== null}>
                {sentences.map((s, i) => (
                  <option key={i} value={i}>{i + 1}. {s.length > 40 ? `${s.slice(0, 40)}…` : s}</option>
                ))}
              </select>
            </label>
            {alternate.phase === null ? (
              <button
                type="button"
                onClick={() => chosen && alternate.start(recorder.url!, chosen)}
                disabled={!ttsSupported || !chosen}
                aria-label="내 녹음과 선택한 문장 읽기를 번갈아 듣기 시작"
              >
                내 녹음 ↔ TTS 번갈아 듣기
              </button>
            ) : (
              <button type="button" onClick={alternate.stop} aria-label="번갈아 듣기 멈추기">번갈아 듣기 멈추기</button>
            )}
            <p className={styles.help} aria-live="polite">
              {alternate.phase === 'mine' && '지금: 내 녹음 재생 중'}
              {alternate.phase === 'tts' && '지금: 선택한 문장을 TTS로 읽는 중'}
              {alternate.phase === null && '내 녹음 전체를 한 번 들려 준 뒤 선택한 문장을 TTS로 읽고, 멈출 때까지 반복합니다. 녹음은 문장별로 나뉘지 않아 전체가 재생됩니다.'}
            </p>
            {!ttsSupported && <p className={styles.help}>이 브라우저는 음성 읽기를 지원하지 않아 번갈아 듣기를 쓸 수 없습니다.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
