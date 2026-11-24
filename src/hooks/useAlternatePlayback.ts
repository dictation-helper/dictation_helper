import { useCallback, useEffect, useRef, useState } from 'react';

export type AlternatePhase = 'mine' | 'tts' | null;

interface Options {
  /** Speaks one text with the TTS voice and calls onDone after it finished by itself. */
  speak: (text: string, onDone: () => void) => void;
  stopSpeaking: () => void;
}

/**
 * Alternates "my whole take" and the TTS reading of one chosen sentence until stopped.
 * The take is a single file without sentence timestamps, so the whole take is played each time.
 */
export function useAlternatePlayback({ speak, stopSpeaking }: Options) {
  const [phase, setPhase] = useState<AlternatePhase>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef(0);
  const optsRef = useRef({ speak, stopSpeaking });
  useEffect(() => {
    optsRef.current = { speak, stopSpeaking };
  });

  const stop = useCallback(() => {
    tokenRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
    audioRef.current = null;
    optsRef.current.stopSpeaking();
    setPhase(null);
  }, []);

  const start = useCallback((url: string, sentence: string) => {
    const token = ++tokenRef.current;
    optsRef.current.stopSpeaking();

    const playMine = () => {
      if (token !== tokenRef.current) return;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (token !== tokenRef.current) return;
        setPhase('tts');
        optsRef.current.speak(sentence, playMine);
      };
      audio.onerror = () => {
        if (token === tokenRef.current) stop();
      };
      setPhase('mine');
      audio.play().catch(() => {
        if (token === tokenRef.current) stop();
      });
    };
    playMine();
  }, [stop]);

  useEffect(() => () => {
    tokenRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  return { phase, start, stop };
}
