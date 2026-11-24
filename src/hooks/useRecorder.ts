import { useCallback, useEffect, useRef, useState } from 'react';
import { isRecordingSupported } from './support';

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'stopped';

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
}

function describeMicError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return '마이크 권한이 거부되었습니다. 주소창의 사이트 설정에서 마이크를 허용한 뒤 다시 시도해 주세요.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return '사용할 수 있는 마이크를 찾지 못했습니다. 마이크 연결을 확인해 주세요.';
  if (name === 'NotReadableError' || name === 'AbortError') return '마이크를 사용할 수 없습니다. 다른 앱이 마이크를 쓰고 있는지 확인해 주세요.';
  return '녹음을 시작하지 못했습니다.';
}

/**
 * Records microphone audio with MediaRecorder. Audio exists only in memory (Blob + object URL),
 * never in localStorage. The length is measured from timestamps. If the tab is hidden while
 * recording, the take is stopped (not discarded) and `notice` explains why.
 */
export function useRecorder() {
  const supported = isRecordingSupported();
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [finalMs, setFinalMs] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const requestRef = useRef(0); // invalidates a pending getUserMedia after reset/unmount
  const aliveRef = useRef(true);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      if (startedAtRef.current !== null) setFinalMs(performance.now() - startedAtRef.current);
      try {
        rec.stop();
      } catch {
        releaseStream();
      }
    }
  }, [releaseStream]);

  const reset = useCallback(() => {
    requestRef.current += 1;
    const rec = recorderRef.current;
    if (rec) {
      rec.ondataavailable = null;
      rec.onstop = null;
      rec.onerror = null;
      if (rec.state !== 'inactive') {
        try {
          rec.stop();
        } catch {
          // already stopped
        }
      }
    }
    recorderRef.current = null;
    releaseStream();
    revokeUrl();
    chunksRef.current = [];
    startedAtRef.current = null;
    setStatus('idle');
    setError(null);
    setNotice(null);
    setStartedAt(null);
    setFinalMs(0);
    setBlob(null);
    setUrl(null);
  }, [releaseStream, revokeUrl]);

  /** Resolves to true when recording actually started. */
  const start = useCallback(async (): Promise<boolean> => {
    if (!supported || status === 'requesting' || status === 'recording') return false;
    reset();
    const myRequest = requestRef.current;
    setStatus('requesting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (myRequest !== requestRef.current || !aliveRef.current) return false;
      setError(describeMicError(err));
      setStatus('idle');
      return false;
    }
    if (myRequest !== requestRef.current || !aliveRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }
    streamRef.current = stream;
    try {
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onerror = () => {
        if (!aliveRef.current) return;
        setError('녹음 중 오류가 발생해 녹음을 멈췄습니다.');
        stop();
      };
      rec.onstop = () => {
        releaseStream();
        recorderRef.current = null;
        if (!aliveRef.current) return;
        const type = rec.mimeType || mimeType || 'audio/webm';
        const out = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (out.size === 0) {
          setError('녹음된 소리가 없습니다. 마이크를 확인한 뒤 다시 녹음해 주세요.');
          setStatus('idle');
          return;
        }
        revokeUrl();
        const objectUrl = URL.createObjectURL(out);
        urlRef.current = objectUrl;
        setBlob(out);
        setUrl(objectUrl);
        setStatus('stopped');
      };
      rec.start();
      const t = performance.now();
      startedAtRef.current = t;
      setStartedAt(t);
      setNow(t);
      setStatus('recording');
      return true;
    } catch {
      releaseStream();
      setError('이 브라우저에서는 녹음을 시작하지 못했습니다.');
      setStatus('idle');
      return false;
    }
  }, [supported, status, reset, stop, releaseStream, revokeUrl]);

  // Re-render while recording; stop safely when the tab is hidden.
  useEffect(() => {
    if (status !== 'recording') return;
    const tick = window.setInterval(() => setNow(performance.now()), 200);
    const onVisibility = () => {
      if (document.hidden) {
        setNotice('탭이 가려져 녹음을 멈췄습니다. 지금까지 녹음한 내용은 아래에서 들을 수 있습니다.');
        stop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [status, stop]);

  // Release the microphone and the object URL on unmount.
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      requestRef.current += 1;
      const rec = recorderRef.current;
      if (rec) {
        rec.ondataavailable = null;
        rec.onstop = null;
        rec.onerror = null;
        if (rec.state !== 'inactive') {
          try {
            rec.stop();
          } catch {
            // already stopped
          }
        }
      }
      releaseStream();
      revokeUrl();
    };
  }, [releaseStream, revokeUrl]);

  const elapsedMs = status === 'recording' && startedAt !== null ? Math.max(0, now - startedAt) : finalMs;
  return { supported, status, error, notice, elapsedMs, blob, url, start, stop, reset };
}
