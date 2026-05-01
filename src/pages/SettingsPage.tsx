import { useState } from 'react';
import { Save, Volume2, Check } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../store';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import type { VoiceType } from '../types';

const VOICE_OPTIONS: { type: VoiceType; label: string; desc: string; emoji: string }[] = [
  { type: 'female', label: '여성 목소리', desc: '명확하고 또렷한 미국식 여성 발음', emoji: '👩' },
  { type: 'male',   label: '남성 목소리', desc: '안정감 있는 남성 발음',           emoji: '👨' },
  { type: 'gentle', label: '부드러운',    desc: '천천히, 듣기 편한 속도로',         emoji: '🌿' },
];

export default function SettingsPage() {
  const { settings, setSettings } = useAppStore();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(settings);

  const { speak } = useSpeechSynthesis(form.speakingRate, form.voiceType);

  const handleSave = () => {
    setSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePreview = () => {
    speak("Hello! It's great to practice English with you today. Let's get started!");
  };

  return (
    <div className="px-4 py-5 space-y-6 pb-8">
      <h2 className="font-bold text-gray-100">설정</h2>

      {/* Voice Type */}
      <Section title="AI 음성 스타일" icon="🎙️">
        <div className="space-y-2">
          {VOICE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => setForm((f) => ({ ...f, voiceType: opt.type }))}
              className={clsx(
                'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
                form.voiceType === opt.type
                  ? 'bg-violet-600/20 border-violet-500 text-violet-200'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
              )}
            >
              <span className="text-2xl shrink-0">{opt.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </div>
              {form.voiceType === opt.type && (
                <Check size={16} className="text-violet-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </Section>

      {/* Speaking Rate */}
      <Section title="말하기 속도" icon="⚡">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">속도</span>
            <span className="text-sm font-medium text-gray-200">{form.speakingRate.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.6}
            max={1.3}
            step={0.05}
            value={form.speakingRate}
            onChange={(e) => setForm((f) => ({ ...f, speakingRate: parseFloat(e.target.value) }))}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>느리게 (0.6x)</span>
            <span>보통 (1.0x)</span>
            <span>빠르게 (1.3x)</span>
          </div>
        </div>
      </Section>

      {/* Auto Speak */}
      <Section title="자동 음성 재생" icon="🔊">
        <div className="space-y-3">
          <Toggle
            label="AI 응답 자동 읽기"
            description="AI가 답변하면 자동으로 음성으로 읽어줍니다"
            checked={form.autoSpeak}
            onChange={(v) => setForm((f) => ({ ...f, autoSpeak: v }))}
          />
          <Toggle
            label="음성 기능 활성화"
            description="음성인식(STT) 및 음성 재생(TTS) 전체 사용"
            checked={form.voiceEnabled}
            onChange={(v) => setForm((f) => ({ ...f, voiceEnabled: v }))}
          />
        </div>
      </Section>

      {/* Target Accent */}
      <Section title="목표 발음" icon="🌍">
        <div className="grid grid-cols-2 gap-2">
          {(['american', 'british'] as const).map((accent) => (
            <button
              key={accent}
              onClick={() => setForm((f) => ({ ...f, targetAccent: accent }))}
              className={clsx(
                'py-3 rounded-xl border text-sm font-medium transition-colors',
                form.targetAccent === accent
                  ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              )}
            >
              {accent === 'american' ? '🇺🇸 미국식' : '🇬🇧 영국식'}
            </button>
          ))}
        </div>
      </Section>

      {/* Preview */}
      <button
        onClick={handlePreview}
        className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 border border-violet-800 hover:border-violet-700 px-4 py-2.5 rounded-xl transition-colors w-full justify-center"
      >
        <Volume2 size={16} />
        음성 미리 듣기
      </button>

      {/* About */}
      <Section title="앱 정보" icon="ℹ️">
        <div className="text-xs text-gray-500 space-y-1">
          <p>SpeakAI v0.2.0 — Claude claude-sonnet-4-6 기반</p>
          <p>Web Speech API + Anthropic Claude API (Cloudflare Pages Function)</p>
          <p className="text-gray-600 mt-2">Chrome / Edge 브라우저에서 음성인식이 가장 잘 작동합니다.</p>
        </div>
      </Section>

      {/* Save */}
      <button
        onClick={handleSave}
        className={clsx(
          'w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors',
          saved ? 'bg-green-600 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'
        )}
      >
        {saved ? <><Check size={16} /> 저장 완료!</> : <><Save size={16} /> 설정 저장</>}
      </button>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <h3 className="font-semibold text-sm text-gray-200">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label, description, checked, onChange, disabled = false,
}: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className={clsx('flex items-center justify-between', disabled && 'opacity-50 pointer-events-none')}>
      <div>
        <p className="text-sm text-gray-300">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={clsx('w-11 h-6 rounded-full transition-colors relative', checked ? 'bg-violet-600' : 'bg-gray-700')}
      >
        <div className={clsx('w-4 h-4 bg-white rounded-full absolute top-1 transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  );
}
