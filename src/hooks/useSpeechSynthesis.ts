import { useCallback, useEffect, useRef, useState } from 'react';
import { isSpeechSynthesisSupported } from './support';

export type PlaybackStatus = 'idle' | 'playing' | 'paused';

export interface SpeakOptions {
  /** null = leave the browser default untouched */
  rate: number | null;
  voice: SpeechSynthesisVoice | null;
  lang: string | undefined;
}

/**
 * Speaks `items` one utterance per item. Highlight state: `activeIndex` is the item being read,
 * `charIndex` the word boundary inside it (null until the browser reports one).
 */
export function useSpeechSynthesis(items: readonly string[], options: SpeakOptions) {
  const supported = isSpeechSynthesisSupported();
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [charIndex, setCharIndex] = useState<number | null>(null);
  const [repeating, setRepeating] = useState(false);
  const [boundaryMissing, setBoundaryMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runRef = useRef(0); // bumped on every start/stop so late events from old utterances are ignored
  const itemsRef = useRef(items);
  const optionsRef = useRef(options);
  useEffect(() => {
    itemsRef.current = items;
    optionsRef.current = options;
  });

  const reset = useCallback(() => {
    setStatus('idle');
    setActiveIndex(null);
    setCharIndex(null);
    setRepeating(false);
  }, []);

  const stop = useCallback(() => {
    runRef.current += 1;
    if (supported) window.speechSynthesis.cancel();
    reset();
  }, [supported, reset]);

  /** Read items[from..to]; with loop=true, repeat items[from] until stopped. */
  const play = useCallback(
    (from: number, to: number, loop = false) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      const run = ++runRef.current;
      synth.cancel();
      setError(null);
      setRepeating(loop);

      const step = (i: number) => {
        const text = itemsRef.current[i];
        if (text === undefined) {
          reset();
          return;
        }
        const { rate, voice, lang } = optionsRef.current;
        const u = new SpeechSynthesisUtterance(text);
        if (voice) {
          u.voice = voice;
          u.lang = voice.lang;
        } else if (lang) {
          u.lang = lang;
        }
        if (rate !== null) u.rate = rate;

        let gotBoundary = false;
        u.onboundary = (e) => {
          if (run !== runRef.current) return;
          if (e.name && e.name !== 'word') return;
          gotBoundary = true;
          setCharIndex(e.charIndex);
        };
        u.onend = () => {
          if (run !== runRef.current) return;
          setBoundaryMissing(!gotBoundary);
          if (loop) step(i);
          else if (i < to) step(i + 1);
          else reset();
        };
        u.onerror = (e) => {
          if (run !== runRef.current) return;
          if (e.error === 'canceled' || e.error === 'interrupted') return;
          runRef.current += 1;
          setError(`음성 재생 중 오류가 발생했습니다 (${e.error}).`);
          reset();
        };

        setActiveIndex(i);
        setCharIndex(null);
        setStatus('playing');
        synth.speak(u);
      };
      step(from);
    },
    [supported, reset],
  );

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setStatus('paused');
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setStatus('playing');
  }, [supported]);

  // Stop when the script changes and when the component unmounts.
  useEffect(() => () => stop(), [items, stop]);

  return { supported, status, activeIndex, charIndex, repeating, boundaryMissing, error, play, pause, resume, stop };
}
