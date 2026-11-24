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

  /**
   * Core loop. `list` returns the text at an index; `highlight` tells whether activeIndex
   * should follow the script. loop: 'item' repeats one item, 'all' repeats from..to.
   */
  const run = useCallback(
    (
      list: () => readonly string[],
      from: number,
      to: number,
      loop: 'none' | 'item' | 'all',
      highlight: boolean,
      onDone?: () => void,
    ) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      const myRun = ++runRef.current;
      synth.cancel();
      setError(null);
      setRepeating(loop !== 'none');

      const finish = () => {
        reset();
        onDone?.();
      };

      const step = (i: number) => {
        const text = list()[i];
        if (text === undefined) {
          finish();
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
          if (myRun !== runRef.current) return;
          if (e.name && e.name !== 'word') return;
          gotBoundary = true;
          setCharIndex(e.charIndex);
        };
        u.onend = () => {
          if (myRun !== runRef.current) return;
          if (highlight) setBoundaryMissing(!gotBoundary);
          if (loop === 'item') step(i);
          else if (i < to) step(i + 1);
          else if (loop === 'all') step(from);
          else finish();
        };
        u.onerror = (e) => {
          if (myRun !== runRef.current) return;
          if (e.error === 'canceled' || e.error === 'interrupted') return;
          runRef.current += 1;
          setError(`음성 재생 중 오류가 발생했습니다 (${e.error}).`);
          reset();
        };

        setActiveIndex(highlight ? i : null);
        setCharIndex(null);
        setStatus('playing');
        synth.speak(u);
      };
      step(from);
    },
    [supported, reset],
  );

  /** Read items[from..to] of the script; with loop=true, repeat items[from] until stopped. */
  const play = useCallback(
    (from: number, to: number, loop = false) => run(() => itemsRef.current, from, to, loop ? 'item' : 'none', true),
    [run],
  );

  /** Read arbitrary texts (not the script). loop repeats the whole list; onDone fires after a natural finish. */
  const playTexts = useCallback(
    (texts: readonly string[], opts: { loop?: boolean; onDone?: () => void } = {}) => {
      if (texts.length === 0) return;
      run(() => texts, 0, texts.length - 1, opts.loop ? 'all' : 'none', false, opts.onDone);
    },
    [run],
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

  return { supported, status, activeIndex, charIndex, repeating, boundaryMissing, error, play, playTexts, pause, resume, stop };
}
