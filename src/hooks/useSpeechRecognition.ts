import { useCallback, useEffect, useRef, useState } from 'react';
import { getRecognitionCtor, type RecognitionEventLike, type RecognitionLike } from './support';

/** Automatic restarts in a row without any recognized text before giving up. */
const MAX_IDLE_RESTARTS = 3;
const RESTART_DELAY_MS = 300;

const FATAL_MESSAGES: Record<string, string> = {
  'not-allowed': '음성 인식 권한이 거부되었습니다. 사이트 설정에서 마이크를 허용해 주세요.',
  'service-not-allowed': '이 브라우저에서는 음성 인식 서비스를 사용할 수 없습니다.',
  network: '음성 인식 서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.',
  'audio-capture': '음성 인식에 사용할 마이크를 찾지 못했습니다.',
  'language-not-supported': '선택한 언어는 이 브라우저의 음성 인식이 지원하지 않습니다.',
};

/**
 * Wraps SpeechRecognition. In Chrome the audio is sent to Google's servers by the browser.
 * Restarts after the engine stops on its own, but only a limited number of times in a row
 * without any result, so it can never loop forever.
 */
export function useSpeechRecognition(lang: string | undefined) {
  const Ctor = getRecognitionCtor();
  const supported = Ctor !== null;
  const [listening, setListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<RecognitionLike | null>(null);
  const wantRef = useRef(false);
  const committedRef = useRef(''); // finals from earlier recognition sessions of this take
  const latestRef = useRef(''); // committed + finals of the running session
  const idleRestartsRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const langRef = useRef(lang);
  const aliveRef = useRef(true);
  useEffect(() => {
    langRef.current = lang;
  });

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const launch = useCallback(() => {
    const C = getRecognitionCtor();
    if (!C) return;
    const rec = new C();
    rec.continuous = true;
    rec.interimResults = true;
    if (langRef.current) rec.lang = langRef.current;
    rec.onresult = (e: RecognitionEventLike) => {
      if (!aliveRef.current || recRef.current !== rec) return;
      let fin = '';
      let tmp = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else tmp += r[0].transcript;
      }
      idleRestartsRef.current = 0;
      latestRef.current = (committedRef.current + ' ' + fin).trim();
      setFinalTranscript(latestRef.current);
      setInterim(tmp.trim());
    };
    rec.onerror = (e) => {
      if (!aliveRef.current || recRef.current !== rec) return;
      const fatal = FATAL_MESSAGES[e.error];
      if (fatal) {
        wantRef.current = false;
        setError(fatal);
      }
      // 'no-speech' and 'aborted' are handled by onend (limited restart / intentional stop).
    };
    rec.onend = () => {
      if (recRef.current !== rec) return;
      recRef.current = null;
      if (!aliveRef.current) return;
      // Keep what was recognized so far; the next session starts with an empty result list.
      committedRef.current = latestRef.current;
      setInterim('');
      if (wantRef.current && idleRestartsRef.current < MAX_IDLE_RESTARTS) {
        idleRestartsRef.current += 1;
        clearTimer();
        timerRef.current = window.setTimeout(() => {
          if (wantRef.current && aliveRef.current && !recRef.current) launch();
        }, RESTART_DELAY_MS);
        return;
      }
      if (wantRef.current) setError('음성 인식이 계속 들리지 않아 자동으로 멈췄습니다. 마이크 소리를 확인해 주세요.');
      wantRef.current = false;
      setListening(false);
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      recRef.current = null;
      wantRef.current = false;
      setListening(false);
      setError('음성 인식을 시작하지 못했습니다.');
    }
  }, []);

  const start = useCallback(() => {
    if (!supported || wantRef.current) return;
    clearTimer();
    wantRef.current = true;
    idleRestartsRef.current = 0;
    committedRef.current = '';
    latestRef.current = '';
    setFinalTranscript('');
    setInterim('');
    setError(null);
    setListening(true);
    launch();
  }, [supported, launch]);

  /** Asks the engine to deliver its last results and end. */
  const stop = useCallback(() => {
    wantRef.current = false;
    clearTimer();
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // not running
      }
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    committedRef.current = '';
    latestRef.current = '';
    setFinalTranscript('');
    setInterim('');
    setError(null);
  }, [stop]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      wantRef.current = false;
      clearTimer();
      const rec = recRef.current;
      recRef.current = null;
      if (rec) {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try {
          rec.abort();
        } catch {
          // not running
        }
      }
    };
  }, []);

  return { supported, listening, finalTranscript, interim, error, start, stop, reset };
}
