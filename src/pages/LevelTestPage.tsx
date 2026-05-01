import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Send, ArrowLeft, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { evaluateLevel, LEVEL_TEST_QUESTIONS } from '../services/claude';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useAppStore } from '../store';
import { TOPICS } from '../data/topics';
import type { LevelTestResult, UserLevel } from '../types';

type Step = 'intro' | 'questions' | 'evaluating' | 'result';

const LEVEL_META: Record<UserLevel, { color: string; bg: string; emoji: string; desc: string }> = {
  beginner:           { color: 'text-green-400',  bg: 'bg-green-900/30 border-green-700',  emoji: '🌱', desc: '기초부터 탄탄히 다지는 단계예요.' },
  elementary:         { color: 'text-blue-400',   bg: 'bg-blue-900/30 border-blue-700',    emoji: '📖', desc: '기본 문장은 통하지만 어휘와 표현을 넓혀야 할 때예요.' },
  intermediate:       { color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-700',emoji: '🚀', desc: '대부분의 상황에서 의사소통이 가능해요. 자연스러움을 키울 때예요.' },
  'upper-intermediate':{ color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-700',emoji: '⭐', desc: '유창하게 대화할 수 있어요. 원어민 표현 감각을 더 키워보세요.' },
  advanced:           { color: 'text-violet-400', bg: 'bg-violet-900/30 border-violet-700',emoji: '👑', desc: '원어민에 가까운 수준이에요. 미묘한 뉘앙스까지 완성해봐요.' },
};

export default function LevelTestPage() {
  const navigate = useNavigate();
  const { settings, setSettings } = useAppStore();
  const [step, setStep] = useState<Step>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<LevelTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isListening, finalTranscript, transcript, startListening, stopListening, resetTranscript, isSupported: speechSupported } = useSpeechRecognition();

  // Sync voice input to textarea
  const combined = (finalTranscript + transcript).trim();
  const displayText = combined || inputText;

  const handleStartListening = () => {
    resetTranscript();
    setInputText('');
    startListening();
  };

  const handleStopListening = () => {
    stopListening();
    if (combined) setInputText(combined);
  };

  const handleSubmitAnswer = () => {
    const text = displayText.trim();
    if (!text) return;
    setAnswers((prev) => ({ ...prev, [LEVEL_TEST_QUESTIONS[currentQ].id]: text }));
    resetTranscript();
    setInputText('');
    if (currentQ < LEVEL_TEST_QUESTIONS.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      handleEvaluate({ ...answers, [LEVEL_TEST_QUESTIONS[currentQ].id]: text });
    }
  };

  const handleEvaluate = async (allAnswers: Record<number, string>) => {
    setStep('evaluating');
    try {
      const responses = LEVEL_TEST_QUESTIONS.map((q) => ({
        questionId: q.id,
        text: allAnswers[q.id] ?? '',
      }));
      const res = await evaluateLevel(undefined, responses);
      setResult(res);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : '평가 중 오류가 발생했습니다.');
      setStep('questions');
    }
  };

  const handleSaveResult = () => {
    if (!result) return;
    setSettings({ userLevel: result.level, levelResult: result });
    navigate('/');
  };

  // ─── Steps ────────────────────────────────────────────────────────────────

  if (step === 'intro') {
    return (
      <div className="px-5 py-8 space-y-8 flex flex-col items-center text-center">
        <div className="space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-violet-900/40 flex items-center justify-center text-4xl mx-auto">🎯</div>
          <h1 className="text-2xl font-bold text-gray-100">영어 레벨 테스트</h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            4개의 질문에 영어로 답해주세요.<br />
            AI가 현재 실력을 분석하고<br />
            맞춤 학습 플랜을 제안해드립니다.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          {LEVEL_TEST_QUESTIONS.map((q, i) => (
            <div key={q.id} className="flex items-start gap-3 text-left bg-gray-900 border border-gray-800 rounded-xl p-3">
              <span className="w-6 h-6 rounded-full bg-violet-800 text-violet-200 text-xs flex items-center justify-center shrink-0 font-bold">{i + 1}</span>
              <p className="text-xs text-gray-400 leading-relaxed">{q.promptKo}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 w-full max-w-sm">
          <button onClick={() => setStep('questions')} className="btn-primary w-full py-3.5 text-base">
            테스트 시작하기 →
          </button>
          {settings.levelResult && (
            <button onClick={() => navigate('/')} className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-2">
              건너뛰기 (현재: {settings.levelResult.levelKo})
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'questions') {
    const q = LEVEL_TEST_QUESTIONS[currentQ];
    const progress = ((currentQ) / LEVEL_TEST_QUESTIONS.length) * 100;

    return (
      <div className="flex flex-col h-full px-4 py-5 space-y-5">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              <ArrowLeft size={18} className="text-gray-400" />
            </button>
            <span className="text-xs text-gray-500">{currentQ + 1} / {LEVEL_TEST_QUESTIONS.length}</span>
            <div />
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-sm flex items-center justify-center font-bold shrink-0">
              {currentQ + 1}
            </span>
            <span className="text-xs text-gray-500">영어로 답해주세요</span>
          </div>
          <p className="text-base font-medium text-gray-100 leading-relaxed">{q.prompt}</p>
          <p className="text-xs text-gray-500 italic">{q.promptKo}</p>
        </div>

        {/* Already answered questions */}
        {currentQ > 0 && (
          <div className="space-y-1.5">
            {Array.from({ length: currentQ }, (_, i) => (
              <div key={i} className="flex items-start gap-2 opacity-50">
                <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500 line-clamp-1">{answers[LEVEL_TEST_QUESTIONS[i].id]}</p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 text-xs text-red-400">{error}</div>
        )}

        {/* Input */}
        <div className="mt-auto space-y-3">
          {isListening && transcript && (
            <div className="px-3 py-2 bg-gray-800/50 rounded-lg text-sm text-gray-400 italic">
              {transcript}…
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={displayText}
            onChange={(e) => { if (!isListening) setInputText(e.target.value); }}
            placeholder="영어로 답변을 입력하세요..."
            rows={4}
            className="input resize-none text-sm leading-relaxed"
          />
          <div className="flex gap-2">
            {speechSupported && (
              <button
                onClick={isListening ? handleStopListening : handleStartListening}
                className={clsx('flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all',
                  isListening ? 'bg-red-500 text-white voice-pulse' : 'bg-gray-800 hover:bg-gray-700 text-gray-300')}
              >
                {isListening ? <><MicOff size={16} /> 완료</> : <><Mic size={16} /> 음성 입력</>}
              </button>
            )}
            <button
              onClick={handleSubmitAnswer}
              disabled={!displayText.trim()}
              className={clsx('flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-colors',
                currentQ === LEVEL_TEST_QUESTIONS.length - 1
                  ? 'bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-40')}
            >
              {currentQ === LEVEL_TEST_QUESTIONS.length - 1 ? '결과 보기' : '다음'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'evaluating') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
        <Loader2 size={48} className="text-violet-400 animate-spin" />
        <div>
          <p className="font-semibold text-gray-100 text-lg">분석 중...</p>
          <p className="text-sm text-gray-500 mt-1">AI가 영어 실력을 평가하고 있어요</p>
        </div>
      </div>
    );
  }

  if (step === 'result' && result) {
    const meta = LEVEL_META[result.level];
    const recommendedTopics = TOPICS.filter((t) => result.recommendedTopicIds.includes(t.id)).slice(0, 3);

    return (
      <div className="px-4 py-5 space-y-5 pb-8">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
            <ArrowLeft size={18} className="text-gray-400" />
          </button>
          <h2 className="font-bold text-gray-100">레벨 테스트 결과</h2>
        </div>

        {/* Level card */}
        <div className={clsx('border rounded-2xl p-5 text-center space-y-2', meta.bg)}>
          <div className="text-4xl">{meta.emoji}</div>
          <div>
            <p className="text-2xl font-bold" style={{ color: meta.color.replace('text-', '') }}>
              <span className={meta.color}>{result.levelKo}</span>
            </p>
            <p className="text-sm text-gray-400">{result.cefrLevel} · {result.overallScore}/10점</p>
          </div>
          <p className="text-sm text-gray-400">{meta.desc}</p>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3 space-y-2">
            <p className="text-xs font-semibold text-green-400">💪 잘하는 것</p>
            {result.strengths.map((s, i) => (
              <p key={i} className="text-xs text-gray-400 leading-relaxed">• {s}</p>
            ))}
          </div>
          <div className="card p-3 space-y-2">
            <p className="text-xs font-semibold text-orange-400">📌 개선할 것</p>
            {result.weaknesses.map((w, i) => (
              <p key={i} className="text-xs text-gray-400 leading-relaxed">• {w}</p>
            ))}
          </div>
        </div>

        {/* Study Tips */}
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold text-violet-400">🎯 맞춤 학습 조언</p>
          <p className="text-sm text-gray-400 leading-relaxed">{result.studyTips}</p>
        </div>

        {/* Recommended topics */}
        {recommendedTopics.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400">✨ 추천 학습 주제</p>
            <div className="space-y-2">
              {recommendedTopics.map((t) => (
                <div key={t.id} className="flex items-center gap-3 card p-3">
                  <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br shrink-0', t.gradient)}>
                    {t.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{t.nameKo}</p>
                    <p className="text-xs text-gray-500">{t.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save & Start */}
        <div className="space-y-3 pt-2">
          <button onClick={handleSaveResult} className="btn-primary w-full py-3.5 text-base">
            이 레벨로 학습 시작하기 →
          </button>
          <button
            onClick={() => { setStep('questions'); setCurrentQ(0); setAnswers({}); setInputText(''); resetTranscript(); }}
            className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-2"
          >
            다시 테스트하기
          </button>
        </div>
      </div>
    );
  }

  return null;
}
