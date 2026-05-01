import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Sparkles,
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
  const { settings, setCurrentSession, currentSession, saveCurrentSession } = useAppStore();

  const topic = TOPICS.find((t) => t.id === topicId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<Analysis | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionStartRef = useRef<Date>(new Date());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { speak, stop: stopSpeaking, isSpeaking } = useSpeechSynthesis(
    settings.speakingRate,
    settings.voicePitch,
    settings.preferredVoice
  );

  const {
    isListening,
    finalTranscript,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: speechSupported,
  } = useSpeechRecognition();

  // Append interim + final transcript to textarea
  useEffect(() => {
    const combined = (finalTranscript + transcript).trim();
    if (combined) setTextInput(combined);
  }, [finalTranscript, transcript]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Start conversation on mount
  useEffect(() => {
    if (!topic || sessionStarted || !settings.apiKey) return;
    setSessionStarted(true);
    sessionStartRef.current = new Date();

    startConversation(settings.apiKey, topic)
      .then((reply) => {
        const aiMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        };
        setMessages([aiMsg]);
        if (settings.autoSpeak && !isMuted) speak(reply);
      })
      .catch((err) => setError(String(err)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, settings.apiKey]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || !topic || !settings.apiKey) return;

      stopListening();
      resetTranscript();
      setTextInput('');
      setError(null);

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setShowCorrection(false);

      try {
        const result = await sendMessage(settings.apiKey, topic, [...messages, userMsg], text.trim());

        const aiMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.reply,
          timestamp: new Date(),
          analysis: result.analysis,
          followUps: result.followUps,
        };

        // Attach analysis to user message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsg.id ? { ...m, analysis: result.analysis } : m
          ).concat(aiMsg)
        );

        setActiveAnalysis(result.analysis);
        setFollowUps(result.followUps);
        setShowCorrection(true);

        if (settings.autoSpeak && !isMuted) speak(result.reply);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      topic,
      settings.apiKey,
      settings.autoSpeak,
      messages,
      isMuted,
      speak,
      stopListening,
      resetTranscript,
    ]
  );

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      const combined = (finalTranscript + transcript).trim();
      if (combined) {
        handleSend(combined);
      }
    } else {
      startListening();
    }
  };

  const handleEndSession = () => {
    if (messages.length === 0) {
      navigate('/');
      return;
    }

    const userMessages = messages.filter((m) => m.role === 'user');
    const scores = userMessages.map((m) => m.analysis?.score ?? 0).filter((s) => s > 0);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const errorsFound = userMessages.reduce(
      (acc, m) => acc + (m.analysis?.errors.length ?? 0),
      0
    );
    const duration = Math.round(
      (new Date().getTime() - sessionStartRef.current.getTime()) / 60000
    );

    const session: ConversationSession = {
      id: crypto.randomUUID(),
      topicId: topic!.id,
      topicName: topic!.nameKo,
      topicIcon: topic!.icon,
      messages,
      startedAt: sessionStartRef.current,
      endedAt: new Date(),
      stats: {
        totalMessages: userMessages.length,
        errorsFound,
        avgScore: Math.round(avgScore * 10) / 10,
        duration,
      },
    };

    setCurrentSession(session);
    saveCurrentSession();
    navigate('/');
  };

  if (!topic) return <div className="p-8 text-center text-gray-500">Topic not found.</div>;

  if (!settings.apiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <AlertCircle size={48} className="text-yellow-400" />
        <p className="text-center text-gray-400">
          Claude API 키가 없습니다. 설정에서 먼저 입력해주세요.
        </p>
        <button onClick={() => navigate('/settings')} className="btn-primary">
          설정으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-950 z-10">
        <button onClick={handleEndSession} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div
          className={clsx(
            'w-9 h-9 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br',
            topic.gradient
          )}
        >
          {topic.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-100 truncate">{topic.nameKo}</p>
          <p className="text-xs text-gray-500 truncate">{topic.name}</p>
        </div>
        <button
          onClick={() => { setIsMuted((m) => !m); if (isSpeaking) stopSpeaking(); }}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {isMuted ? (
            <VolumeX size={18} className="text-gray-500" />
          ) : (
            <Volume2 size={18} className="text-gray-400" />
          )}
        </button>
        <button
          onClick={handleEndSession}
          className="text-xs text-red-400 hover:text-red-300 border border-red-800 hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          종료
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onShowAnalysis={(analysis) => {
              setActiveAnalysis(analysis);
              setShowCorrection(true);
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

      {/* Correction Panel */}
      {showCorrection && activeAnalysis && (
        <CorrectionPanel
          analysis={activeAnalysis}
          followUps={followUps}
          onClose={() => setShowCorrection(false)}
          onUseFollowUp={(text) => {
            setTextInput(text);
            setShowCorrection(false);
            textareaRef.current?.focus();
          }}
        />
      )}

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-gray-800 bg-gray-950">
        {/* Interim transcript display */}
        {isListening && transcript && (
          <div className="mb-2 px-3 py-2 bg-gray-800/50 rounded-lg text-sm text-gray-400 italic">
            {transcript}…
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(textInput);
              }
            }}
            placeholder="영어로 입력하거나 마이크를 누르세요..."
            rows={1}
            className="input resize-none min-h-[44px] max-h-32 py-3 text-sm leading-5"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 128) + 'px';
            }}
          />

          {/* Voice button */}
          {speechSupported && (
            <button
              onClick={handleVoiceToggle}
              disabled={isLoading}
              className={clsx(
                'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all',
                isListening
                  ? 'bg-red-500 voice-pulse'
                  : 'bg-gray-800 hover:bg-gray-700'
              )}
            >
              {isListening ? (
                <MicOff size={18} className="text-white" />
              ) : (
                <Mic size={18} className="text-gray-300" />
              )}
            </button>
          )}

          {/* Send button */}
          <button
            onClick={() => handleSend(textInput)}
            disabled={!textInput.trim() || isLoading}
            className="w-11 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-colors"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>

        {/* Voice waveform */}
        {isListening && (
          <div className="flex items-center justify-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`wave-bar w-1 h-4 bg-violet-500 rounded-full`}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
            <span className="text-xs text-violet-400 ml-2">듣고 있어요...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  onShowAnalysis,
}: {
  message: Message;
  onShowAnalysis: (a: Analysis) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={clsx('max-w-[85%] space-y-1.5', isUser ? 'items-end' : 'items-start')}>
        {!isUser && (
          <div className="flex items-center gap-1.5 ml-1">
            <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
              <Sparkles size={10} className="text-white" />
            </div>
            <span className="text-xs text-gray-500">AI Partner</span>
          </div>
        )}

        <div
          className={clsx(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-violet-600 text-white rounded-tr-sm'
              : 'bg-gray-800 text-gray-100 rounded-tl-sm'
          )}
        >
          {message.content}
        </div>

        {/* Score badge for user messages */}
        {isUser && message.analysis && (
          <div className="flex items-center justify-end gap-2 mr-1">
            <ScoreBadge score={message.analysis.score} />
            <button
              onClick={() => onShowAnalysis(message.analysis!)}
              className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              교정 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 9 ? 'text-green-400 bg-green-900/40 border-green-800' :
    score >= 7 ? 'text-yellow-400 bg-yellow-900/40 border-yellow-800' :
    'text-red-400 bg-red-900/40 border-red-800';
  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium', color)}>
      {score}/10
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="typing-dot w-2 h-2 bg-gray-500 rounded-full"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function CorrectionPanel({
  analysis,
  followUps,
  onClose,
  onUseFollowUp,
}: {
  analysis: Analysis;
  followUps: string[];
  onClose: () => void;
  onUseFollowUp: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const errorTypeLabel = (type: string) => ({
    grammar: '문법',
    vocabulary: '어휘',
    naturalness: '자연스러움',
    spelling: '철자',
  }[type] ?? type);

  const errorTypeBg = (type: string) =>
    ({
      grammar: 'bg-red-900/30 border-red-800/50 text-red-400',
      vocabulary: 'bg-blue-900/30 border-blue-800/50 text-blue-400',
      naturalness: 'bg-orange-900/30 border-orange-800/50 text-orange-400',
      spelling: 'bg-pink-900/30 border-pink-800/50 text-pink-400',
    }[type] ?? 'bg-gray-800 border-gray-700 text-gray-400');

  return (
    <div className="border-t border-gray-800 bg-gray-900 max-h-72 overflow-y-auto">
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2">
          {analysis.hasErrors ? (
            <AlertCircle size={16} className="text-yellow-400" />
          ) : (
            <CheckCircle size={16} className="text-green-400" />
          )}
          <span className="text-sm font-medium text-gray-200">
            {analysis.hasErrors ? '교정 결과' : '완벽해요! ✨'}
          </span>
          <ScoreBadge score={analysis.score} />
        </div>
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronUp size={16} className="text-gray-500" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-0.5 hover:text-gray-300 text-gray-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Feedback */}
          <p className="text-sm text-gray-400 italic">{analysis.feedback}</p>

          {/* Corrected text */}
          {analysis.hasErrors && (
            <div className="bg-gray-800/60 rounded-xl p-3 space-y-1">
              <p className="text-xs text-gray-500 font-medium">교정된 문장</p>
              <p className="text-sm text-green-300">{analysis.correctedText}</p>
            </div>
          )}

          {/* Errors */}
          {analysis.errors.map((err, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'text-xs px-2 py-0.5 rounded-full border font-medium',
                    errorTypeBg(err.type)
                  )}
                >
                  {errorTypeLabel(err.type)}
                </span>
              </div>
              <div className="text-sm space-y-0.5">
                <div>
                  <span className="text-gray-500 line-through">{err.original}</span>
                  <span className="text-gray-500 mx-1.5">→</span>
                  <span className="text-green-400 font-medium">{err.correction}</span>
                </div>
                <p className="text-xs text-gray-500">{err.explanation}</p>
              </div>
            </div>
          ))}

          {/* Better expressions */}
          {analysis.betterExpressions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 font-medium">더 자연스러운 표현</p>
              <div className="flex flex-wrap gap-2">
                {analysis.betterExpressions.map((expr, i) => (
                  <button
                    key={i}
                    onClick={() => onUseFollowUp(expr)}
                    className="text-xs bg-violet-900/30 border border-violet-800/50 text-violet-300 px-2.5 py-1 rounded-lg hover:bg-violet-800/40 transition-colors"
                  >
                    {expr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Follow-ups */}
          {followUps.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 font-medium">이렇게 대답해볼까요?</p>
              <div className="space-y-1.5">
                {followUps.map((fu, i) => (
                  <button
                    key={i}
                    onClick={() => onUseFollowUp(fu)}
                    className="w-full text-left text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-2 rounded-lg transition-colors"
                  >
                    💬 {fu}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
