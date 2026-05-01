import { useState } from 'react';
import { Eye, EyeOff, Save, Volume2, Mic, Check } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../store';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

export default function SettingsPage() {
  const { settings, setSettings } = useAppStore();
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(settings);

  const { voices, speak } = useSpeechSynthesis(
    form.speakingRate,
    form.voicePitch,
    form.preferredVoice
  );

  const handleSave = () => {
    setSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePreview = () => {
    speak("Hello! I'm your English speaking partner. Let's practice together today.");
  };

  return (
    <div className="px-4 py-5 space-y-6 pb-8">
      <h2 className="font-bold text-gray-100">설정</h2>

      {/* API Key */}
      <Section title="Claude API 키" icon="🔑">
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            Anthropic Console에서 발급받은 API 키를 입력하세요.
            키는 이 기기의 브라우저에만 저장됩니다.
          </p>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.apiKey}
              onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
              placeholder="sk-ant-..."
              className="input pr-11 font-mono text-sm"
            />
            <button
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.apiKey && (
            <p className="text-xs text-green-500 flex items-center gap-1">
              <Check size={12} /> API 키가 입력되었습니다
            </p>
          )}
        </div>
      </Section>

      {/* Voice Settings */}
      <Section title="음성 설정" icon="🎤">
        <div className="space-y-4">
          <Toggle
            label="음성 응답 활성화"
            description="AI 응답을 자동으로 읽어줍니다"
            checked={form.voiceEnabled}
            onChange={(v) => setForm((f) => ({ ...f, voiceEnabled: v }))}
          />
          <Toggle
            label="자동 읽기"
            description="AI가 답변하면 자동으로 음성 재생"
            checked={form.autoSpeak}
            onChange={(v) => setForm((f) => ({ ...f, autoSpeak: v }))}
            disabled={!form.voiceEnabled}
          />

          {/* Speaking rate */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm text-gray-300">말하기 속도</label>
              <span className="text-sm text-gray-400">{form.speakingRate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={form.speakingRate}
              onChange={(e) => setForm((f) => ({ ...f, speakingRate: parseFloat(e.target.value) }))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>느림 (0.5x)</span>
              <span>보통 (1.0x)</span>
              <span>빠름 (1.5x)</span>
            </div>
          </div>

          {/* Voice pitch */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm text-gray-300">음성 높낮이</label>
              <span className="text-sm text-gray-400">{form.voicePitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={form.voicePitch}
              onChange={(e) => setForm((f) => ({ ...f, voicePitch: parseFloat(e.target.value) }))}
              className="w-full accent-violet-500"
            />
          </div>

          {/* Voice selection */}
          {voices.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm text-gray-300">음성 선택</label>
              <select
                value={form.preferredVoice}
                onChange={(e) => setForm((f) => ({ ...f, preferredVoice: e.target.value }))}
                className="input text-sm"
              >
                <option value="">기본 음성</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Preview button */}
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 border border-violet-800 hover:border-violet-700 px-4 py-2 rounded-xl transition-colors"
          >
            <Volume2 size={16} />
            음성 미리듣기
          </button>
        </div>
      </Section>

      {/* Target accent */}
      <Section title="목표 영어 발음" icon="🌍">
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
              {accent === 'american' ? '🇺🇸 American' : '🇬🇧 British'}
            </button>
          ))}
        </div>
      </Section>

      {/* About */}
      <Section title="앱 정보" icon="ℹ️">
        <div className="text-xs text-gray-500 space-y-1">
          <p>SpeakAI v0.1.0 — Claude claude-sonnet-4-6 기반</p>
          <p>Web Speech API (음성인식 · TTS) + Anthropic Claude API</p>
          <p className="text-gray-600 mt-2">
            Chrome/Edge 브라우저에서 음성인식이 가장 잘 작동합니다.
          </p>
        </div>
      </Section>

      {/* Save button */}
      <button
        onClick={handleSave}
        className={clsx(
          'w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors',
          saved
            ? 'bg-green-600 text-white'
            : 'bg-violet-600 hover:bg-violet-500 text-white'
        )}
      >
        {saved ? (
          <>
            <Check size={16} /> 저장되었습니다!
          </>
        ) : (
          <>
            <Save size={16} /> 설정 저장
          </>
        )}
      </button>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
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
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      <div>
        <p className="text-sm text-gray-300">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={clsx(
          'w-11 h-6 rounded-full transition-colors relative',
          checked ? 'bg-violet-600' : 'bg-gray-700'
        )}
      >
        <div
          className={clsx(
            'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}
