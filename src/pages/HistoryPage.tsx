import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Clock, MessageSquare, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';
import { useAppStore } from '../store';
import { storage } from '../services/storage';
import type { ConversationSession } from '../types';

export default function HistoryPage() {
  const { sessions, setSessions } = useAppStore();

  const handleDelete = (id: string) => {
    storage.deleteSession(id);
    setSessions(storage.getSessions());
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-8">
        <span className="text-5xl">📚</span>
        <p className="font-semibold text-gray-300">아직 대화 기록이 없어요</p>
        <p className="text-sm text-gray-500">첫 번째 영어 대화를 시작해보세요!</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-gray-100">대화 기록</h2>
        <span className="text-xs text-gray-500">{sessions.length}개 세션</span>
      </div>

      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} onDelete={handleDelete} />
      ))}
    </div>
  );
}

function SessionCard({
  session,
  onDelete,
}: {
  session: ConversationSession;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const userMessages = session.messages.filter((m) => m.role === 'user');

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="text-2xl shrink-0">{session.topicIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-100 truncate">
              {session.topicName}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {format(session.startedAt, 'M월 d일 (E) HH:mm', { locale: ko })}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ScoreRing score={session.stats.avgScore} />
          {expanded ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 px-4 pb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <MessageSquare size={12} />
          {session.stats.totalMessages}개 발화
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {session.stats.duration}분
        </span>
        {session.stats.errorsFound > 0 && (
          <span className="flex items-center gap-1 text-yellow-600">
            ✏️ {session.stats.errorsFound}개 교정
          </span>
        )}
      </div>

      {/* Expanded conversation */}
      {expanded && (
        <div className="border-t border-gray-800 px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
          {session.messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={clsx(
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-violet-600/70 text-white'
                    : 'bg-gray-800 text-gray-300'
                )}
              >
                {msg.content}
                {msg.analysis && msg.analysis.hasErrors && (
                  <div className="mt-1.5 pt-1.5 border-t border-white/10 text-xs text-violet-200 opacity-80">
                    ✏️ {msg.analysis.correctedText}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end px-4 pb-3">
        <button
          onClick={() => onDelete(session.id)}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors"
        >
          <Trash2 size={13} />
          삭제
        </button>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  if (!score) return null;
  const color =
    score >= 9 ? 'text-green-400 border-green-700' :
    score >= 7 ? 'text-yellow-400 border-yellow-700' :
    'text-red-400 border-red-700';
  return (
    <div className={clsx('w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold', color)}>
      {score.toFixed(1)}
    </div>
  );
}
