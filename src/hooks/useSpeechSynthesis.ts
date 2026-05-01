import { useState, useCallback, useEffect, useRef } from 'react';
import type { VoiceType } from '../types';

export interface SpeechSynthesisResult {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

const FEMALE_NAMES = ['Samantha', 'Ava', 'Allison', 'Karen', 'Victoria', 'Tessa', 'Moira', 'Susan', 'Google US English', 'Zira', 'Aria', 'Jenny'];
const MALE_NAMES   = ['Alex', 'Daniel', 'Fred', 'Tom', 'Google UK English Male', 'David', 'Guy', 'Mark', 'James', 'Ryan'];

function pickVoice(voices: SpeechSynthesisVoice[], type: VoiceType): SpeechSynthesisVoice | undefined {
  const names = type === 'male' ? MALE_NAMES : FEMALE_NAMES;
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

  // Stable ref for the selected voice — prevents re-selection mid-conversation
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);

  useEffect(() => {
    if (!isSupported) return;
    const load = () => {
      const available = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
      if (available.length > 0) setVoices(available);
    };
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', load);
      speechSynthesis.cancel();
    };
  }, [isSupported]);

  // Update selected voice ONLY when voiceType changes or voices first load — not on every render
  useEffect(() => {
    if (voices.length === 0) return;
    const picked = pickVoice(voices, voiceType);
    selectedVoiceRef.current = picked;
  }, [voices, voiceType]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return;
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = voiceType === 'gentle' ? Math.min(rate, 0.82) : rate;
      utterance.pitch = voiceType === 'gentle' ? 0.88 : 1.0;

      // Use the stable ref — won't flicker between voices mid-session
      if (selectedVoiceRef.current) utterance.voice = selectedVoiceRef.current;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthesis.speak(utterance);
    },
    [isSupported, rate, voiceType] // 'voices' intentionally excluded — using ref
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported };
}
