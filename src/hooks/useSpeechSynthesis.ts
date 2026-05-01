import { useState, useCallback, useEffect, useRef } from 'react';

export interface SpeechSynthesisResult {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  voices: SpeechSynthesisVoice[];
  isSupported: boolean;
}

export function useSpeechSynthesis(
  rate = 0.95,
  pitch = 1.0,
  preferredVoice = ''
): SpeechSynthesisResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!isSupported) return;
    const load = () => {
      const available = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
      setVoices(available);
    };
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', load);
      speechSynthesis.cancel();
    };
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return;
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Pick the best available English voice
      let voice: SpeechSynthesisVoice | undefined;
      if (preferredVoice) {
        voice = voices.find((v) => v.name === preferredVoice);
      }
      if (!voice) {
        const priority = [
          'Samantha',
          'Google US English',
          'Microsoft Aria',
          'Alex',
          'Karen',
          'Victoria',
        ];
        for (const name of priority) {
          voice = voices.find((v) => v.name.includes(name));
          if (voice) break;
        }
      }
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    },
    [isSupported, rate, pitch, preferredVoice, voices]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, stop, isSpeaking, voices, isSupported };
}
