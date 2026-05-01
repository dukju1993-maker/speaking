import { useMemo } from 'react';
import { Flame, Target, Clock, BookOpen, TrendingUp, Award } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../store';
import { TOPICS } from '../data/topics';

export default function ProgressPage() {
  const { stats, sessions } = useAppStore();

  const recentSessions = sessions.slice(0, 7);

  const commonErrors = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
      s.messages.forEach((m) => {
        m.analysis?.errors.forEach((e) => {
          counts[e.type] = (counts[e.type] ?? 0) + 1;
        });
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [sessions]);

  const errorTypeLabel: Record<string, string> = {
    grammar: '문법',
    vocabulary: '어휘',
    naturalness: '자연스러움',
    spelling: '철자',
  };

  const maxErrors = Math.max(...commonErrors.map(([, c]) => c), 1);

  const exploredTopics = TOPICS.filter((t) => stats.topicsExplored.includes(t.id));

  const weeklyScores = useMemo(() => {
    return recentSessions
      .map((s) => ({ label: s.topicIcon, score: s.stats.avgScore }))
      .reverse();
  }, [recentSessions]);

  return (
    <div className="px-4 py-5 space-y-5">
      <h2 className="font-bold text-gray-100">나의 진도</h2>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Flame size={20} className="text-orange-400" />}
          title="연속 학습"
          value={`${stats.currentStreak}일`}
          sub={`최고 ${stats.longestStreak}일`}
          bg="from-orange-900/30 to-orange-800/10 border-orange-800/50"
        />
        <StatCard
          icon={<Target size={20} className="text-violet-400" />}
          title="총 세션"
          value={`${stats.totalSessions}회`}
          sub={`이번 주 ${stats.sessionsThisWeek}회`}
          bg="from-violet-900/30 to-violet-800/10 border-violet-800/50"
        />
        <StatCard
          icon={<Clock size={20} className="text-cyan-400" />}
          title="총 학습 시간"
          value={`${stats.totalMinutes}분`}
          sub={`약 ${(stats.totalMinutes / 60).toFixed(1)}시간`}
          bg="from-cyan-900/30 to-cyan-800/10 border-cyan-800/50"
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-green-400" />}
          title="평균 점수"
          value={stats.avgScore > 0 ? `${stats.avgScore}/10` : '--'}
          sub="(10점 만점)"
          bg="from-green-900/30 to-green-800/10 border-green-800/50"
        />
      </div>

      {/* Recent session scores */}
      {weeklyScores.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">최근 세션 점수</h3>
          <div className="flex items-end justify-around gap-2 h-24">
            {weeklyScores.map((s, i) => {
              const height = s.score > 0 ? `${(s.score / 10) * 100}%` : '10%';
              const color =
                s.score >= 9 ? 'bg-green-500' :
                s.score >= 7 ? 'bg-yellow-500' :
                s.score > 0 ? 'bg-red-500' : 'bg-gray-700';
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs text-gray-500">
                    {s.score > 0 ? s.score.toFixed(1) : '--'}
                  </span>
                  <div className="w-full flex items-end justify-center h-16">
                    <div
                      className={clsx('w-6 rounded-t-sm transition-all', color)}
                      style={{ height }}
                    />
                  </div>
                  <span className="text-sm">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error breakdown */}
      {commonErrors.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-3">자주 나오는 오류</h3>
          <div className="space-y-2.5">
            {commonErrors.map(([type, count]) => (
              <div key={type} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{errorTypeLabel[type] ?? type}</span>
                  <span className="text-gray-500">{count}회</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{ width: `${(count / maxErrors) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topics explored */}
      {exploredTopics.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-200">
              경험한 주제 ({exploredTopics.length}/{TOPICS.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {exploredTopics.map((t) => (
              <span
                key={t.id}
                className="flex items-center gap-1.5 text-xs bg-gray-800 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-full"
              >
                {t.icon} {t.nameKo}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
          <Award size={40} className="text-gray-700" />
          <p className="text-sm text-gray-500">아직 데이터가 없어요. 대화를 시작해보세요!</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  sub,
  bg,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
  bg: string;
}) {
  return (
    <div className={clsx('border rounded-2xl p-4 bg-gradient-to-br', bg)}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-400">{title}</span>
      </div>
      <div className="text-xl font-bold text-gray-100">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}
