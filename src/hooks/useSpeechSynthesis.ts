import { useState, useCallback, useEffect } from 'react';
import type { VoiceType } from '../types';

export interface SpeechSynthesisResult {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

const FEMALE_NAMES = ['Samantha', 'Ava', 'Allison', 'Karen', 'Victoria', 'Tessa', 'Moira', 'Susan', 'Google US English', 'Zira', 'Aria'];
const MALE_NAMES   = ['Alex', 'Daniel', 'Fred', 'Tom', 'Google UK English Male', 'David', 'Guy', 'Mark', 'James'];

function pickVoice(voices: SpeechSynthesisVoice[], type: VoiceType): SpeechSynthesisVoice | undefined {
  const names = (type === 'male') ? MALE_NAMES : FEMALE_NAMES;
  for (const name of names) {
    const v = voices.find((v) => v.name.includes(name));
    if (v) return v;
  }
  return voices[0];
}

export function useSpeechSynthesis(
  rate = 0.95,
  voiceType: VoiceType = 'female'
): SpeechSynthesisResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
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
      utterance.rate = voiceType === 'gentle' ? Math.min(rate, 0.85) : rate;
      utterance.pitch = voiceType === 'gentle' ? 0.9 : 1.0;

      const voice = pickVoice(voices, voiceType);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthesis.speak(utterance);
    },
    [isSupported, rate, voiceType, voices]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported };
}
