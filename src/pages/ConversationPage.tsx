import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mic, MicOff, Send, Volume2, VolumeX,
  CheckCircle, AlertCircle, Sparkles, X,
} from 'lucide-react';
import clsx from 'clsx';
import { TOPICS } from '../data/topics';
import { useAppStore } from '../store';
import { sendMessage, startConversation } from '../services/claude';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import type { Message, Analysis, ConversationSession } from '../types';

export default function ConversationPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { settings, setCurrentSession, saveCurrentSession } = useAppStore();
  const topic = TOPICS.find((t) => t.id === topicId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Correction panel: null = never shown, Analysis = show
  const [activeAnalysis, setActiveAnalysis] = useState<Analysis | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionStartRef = useRef<Date>(new Date());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { speak, stop: stopSpeaking, isSpeaking } = useSpeechSynthesis(
    settings.speakingRate,
    settings.voiceType
  );
  const { isListening, finalTranscript, transcript, startListening, stopListening, resetTranscript, isSupported: speechSupported } = useSpeechRecognition();

  useEffect(() => {
    const combined = (finalTranscript + transcript).trim();
    if (combined) setTextInput(combined);
  }, [finalTranscript, transcript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Start conversation
  useEffect(() => {
    if (!topic || sessionStarted) return;
    setSessionStarted(true);
    sessionStartRef.current = new Date();
    startConversation(undefined, topic, settings.userLevel)
      .then((reply) => {
        setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: new Date() }]);
        if (settings.autoSpeak && !isMuted) speak(reply);
      })
      .catch((err) => setError(String(err)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || !topic) return;
    stopListening();
    resetTranscript();
    setTextInput('');
    setError(null);
    setCorrectionOpen(false); // hide previous correction

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = await sendMessage(undefined, topic, settings.userLevel, [...messages, userMsg], text.trim());
      const aiMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: result.reply, timestamp: new Date() };
      setMessages((prev) =>
        prev.map((m) => m.id === userMsg.id ? { ...m, analysis: result.analysis } : m).concat(aiMsg)
      );
      setActiveAnalysis(result.analysis);
      if (settings.autoSpeak && !isMuted) speak(result.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, topic, settings.userLevel, settings.autoSpeak, messages, isMuted, speak, stopListening, resetTranscript]);

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      const combined = (finalTranscript + transcript).trim();
      if (combined) handleSend(combined);
    } else {
      startListening();
    }
  };

  const handleEndSession = () => {
    if (messages.length === 0) { navigate('/'); return; }
    const userMessages = messages.filter((m) => m.role === 'user');
    const scores = userMessages.map((m) => m.analysis?.score ?? 0).filter(Boolean);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const errorsFound = userMessages.reduce((acc, m) => acc + (m.analysis?.errors.length ?? 0), 0);
    const duration = Math.round((Date.now() - sessionStartRef.current.getTime()) / 60000);
    const session: ConversationSession = {
      id: crypto.randomUUID(),
      topicId: topic!.id, topicName: topic!.nameKo, topicIcon: topic!.icon,
      messages, startedAt: sessionStartRef.current, endedAt: new Date(),
      stats: { totalMessages: userMessages.length, errorsFound, avgScore: Math.round(avgScore * 10) / 10, duration },
    };
    setCurrentSession(session);
    saveCurrentSession();
    navigate('/');
  };

  if (!topic) return <div className="p-8 text-center text-gray-500">토픽을 찾을 수 없습니다.</div>;

  const showCorrectionPanel = correctionOpen && activeAnalysis;

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-950 z-10 shrink-0">
        <button onClick={handleEndSession} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br shrink-0', topic.gradient)}>
          {topic.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-100 truncate">{topic.nameKo}</p>
          <p className="text-xs text-gray-500">{topic.name} · {LEVEL_LABEL[settings.userLevel]}</p>
        </div>
        <button
          onClick={() => { setIsMuted((m) => !m); if (isSpeaking) stopSpeaking(); }}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {isMuted ? <VolumeX size={18} className="text-gray-500" /> : <Volume2 size={18} className="text-gray-400" />}
        </button>
        <button onClick={handleEndSession} className="text-xs text-red-400 hover:text-red-300 border border-red-800/60 px-3 py-1.5 rounded-lg transition-colors">
          종료
        </button>
      </div>

      {/* Body: chat + optional correction panel */}
      <div className="flex flex-1 overflow-hidden">

        {/* Chat area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onShowAnalysis={(a) => {
                  setActiveAnalysis(a);
                  setCorrectionOpen(true);
                }}
              />
            ))}
            {isLoading && <TypingIndicator />}
            {error && (
              <div className="flex items-start gap-2 bg-red-900/20 border border-red-800/50 rounded-xl p-3">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-800 bg-gray-950 shrink-0">
            {isListening && transcript && (
              <div className="mb-2 px-3 py-1.5 bg-gray-800/50 rounded-lg text-sm text-gray-400 italic">
                {transcript}…
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(textInput); } }}
                placeholder="영어로 입력하거나 마이크를 누르세요..."
                rows={1}
                className="input resize-none min-h-[44px] max-h-32 py-3 text-sm leading-5"
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                }}
              />
              {speechSupported && (
                <button
                  onClick={handleVoiceToggle}
                  disabled={isLoading}
                  className={clsx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all',
                    isListening ? 'bg-red-500 voice-pulse' : 'bg-gray-800 hover:bg-gray-700')}
                >
                  {isListening ? <MicOff size={18} className="text-white" /> : <Mic size={18} className="text-gray-300" />}
                </button>
              )}
              <button
                onClick={() => handleSend(textInput)}
                disabled={!textInput.trim() || isLoading}
                className="w-11 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center shrink-0 transition-colors"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
            {isListening && (
              <div className="flex items-center justify-center gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="wave-bar w-1 h-4 bg-violet-500 rounded-full" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
                <span className="text-xs text-violet-400 ml-2">듣고 있어요...</span>
              </div>
            )}
          </div>
        </div>

        {/* Correction panel — desktop side panel (hidden until opened) */}
        <div
          className={clsx(
            'hidden lg:flex flex-col border-l border-gray-800 bg-gray-900/60 shrink-0 overflow-hidden transition-all duration-300',
            showCorrectionPanel ? 'w-80 xl:w-96' : 'w-0'
          )}
        >
          {showCorrectionPanel && (
            <CorrectionContent
              analysis={activeAnalysis}
              onClose={() => setCorrectionOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Correction panel — mobile bottom sheet */}
      {showCorrectionPanel && (
        <div className="lg:hidden border-t border-gray-800 bg-gray-900 max-h-72 overflow-y-auto animate-slide-up">
          <CorrectionContent
            analysis={activeAnalysis}
            onClose={() => setCorrectionOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = {
  beginner: '입문', elementary: '초급', intermediate: '중급',
  'upper-intermediate': '중상급', advanced: '고급',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageBubble({ message, onShowAnalysis }: {
  message: Message;
  onShowAnalysis: (a: Analysis) => void;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[85%] space-y-1.5">
        {!isUser && (
          <div className="flex items-center gap-1.5 ml-1">
            <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
              <Sparkles size={10} className="text-white" />
            </div>
            <span className="text-xs text-gray-500">AI Partner</span>
          </div>
        )}
        <div className={clsx('rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser ? 'bg-violet-600 text-white rounded-tr-sm' : 'bg-gray-800 text-gray-100 rounded-tl-sm'
        )}>
          {message.content}
        </div>
        {isUser && message.analysis && (
          <div className="flex items-center justify-end gap-2 mr-1">
            <ScorePill score={message.analysis.score} />
            <button
              onClick={() => onShowAnalysis(message.analysis!)}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
            >
              교정 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 9 ? 'text-green-400 bg-green-900/40 border-green-800'
    : score >= 7 ? 'text-yellow-400 bg-yellow-900/40 border-yellow-800'
    : 'text-red-400 bg-red-900/40 border-red-800';
  return <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium', color)}>{score}/10</span>;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="typing-dot w-2 h-2 bg-gray-500 rounded-full" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

function CorrectionContent({ analysis, onClose }: { analysis: Analysis; onClose: () => void }) {
  const typeColor: Record<string, string> = {
    grammar:    'bg-red-900/30 border-red-800/50 text-red-400',
    vocabulary: 'bg-blue-900/30 border-blue-800/50 text-blue-400',
    naturalness:'bg-orange-900/30 border-orange-800/50 text-orange-400',
    spelling:   'bg-pink-900/30 border-pink-800/50 text-pink-400',
  };
  const typeLabel: Record<string, string> = {
    grammar: '문법', vocabulary: '어휘', naturalness: '자연스러움', spelling: '철자',
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {analysis.hasErrors
            ? <AlertCircle size={15} className="text-yellow-400" />
            : <CheckCircle size={15} className="text-green-400" />}
          <span className="text-sm font-semibold text-gray-200">
            {analysis.hasErrors ? '교정 결과' : '완벽해요! ✨'}
          </span>
          <ScorePill score={analysis.score} />
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Feedback */}
      <p className="text-sm text-gray-400 leading-relaxed">{analysis.feedback}</p>

      {/* Corrected sentence */}
      {analysis.hasErrors && (
        <div className="bg-gray-800/60 rounded-xl p-3 space-y-1.5">
          <p className="text-xs text-gray-500 font-medium">✅ 교정된 문장</p>
          <p className="text-sm text-green-300 leading-relaxed">{analysis.correctedText}</p>
        </div>
      )}

      {/* Error list */}
      {analysis.errors.map((err, i) => (
        <div key={i} className="space-y-1.5">
          <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-full border font-medium', typeColor[err.type] ?? 'bg-gray-800 border-gray-700 text-gray-400')}>
            {typeLabel[err.type] ?? err.type}
          </span>
          <div className="space-y-0.5 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-gray-500 line-through">{err.original}</span>
              <span className="text-gray-600">→</span>
              <span className="text-green-400 font-medium">{err.correction}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{err.explanation}</p>
          </div>
        </div>
      ))}

      {/* Better expressions */}
      {analysis.betterExpressions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500 font-medium">💡 더 자연스러운 표현</p>
          <div className="space-y-1.5">
            {analysis.betterExpressions.map((expr, i) => (
              <div key={i} className="text-xs bg-violet-900/20 border border-violet-800/40 text-violet-300 px-3 py-2 rounded-lg">
                {expr}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
