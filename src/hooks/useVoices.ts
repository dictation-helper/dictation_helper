import { useEffect, useState } from 'react';
import { isSpeechSynthesisSupported } from './support';

/** getVoices() fills asynchronously in some browsers, so listen for voiceschanged. */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() =>
    isSpeechSynthesisSupported() ? window.speechSynthesis.getVoices() : [],
  );
  useEffect(() => {
    if (!isSpeechSynthesisSupported()) return;
    const synth = window.speechSynthesis;
    const update = () => setVoices(synth.getVoices());
    update();
    synth.addEventListener('voiceschanged', update);
    return () => synth.removeEventListener('voiceschanged', update);
  }, []);
  return voices;
}
