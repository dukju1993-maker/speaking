import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, Flame, Target } from 'lucide-react';
import clsx from 'clsx';
import { TOPICS, TOPIC_CATEGORIES } from '../data/topics';
import { useAppStore } from '../store';
import type { TopicCategory } from '../types';

export default function HomePage() {
  const navigate = useNavigate();
  const { settings, stats } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<TopicCategory | 'all'>('all');

  const filtered =
    activeCategory === 'all' ? TOPICS : TOPICS.filter((t) => t.category === activeCategory);

  return (
    <div className="px-4 py-5 space-y-6">
      {/* API key hint — only shown if no local key and no server key detected */}
      {!settings.apiKey && (
        <div
          className="flex items-start gap-3 bg-gray-800/60 border border-gray-700 rounded-xl p-4 cursor-pointer"
          onClick={() => navigate('/settings')}
        >
          <AlertCircle size={18} className="text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-300">API 키 미설정</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Cloudflare 환경변수에 <code className="text-violet-400">ANTHROPIC_API_KEY</code>가 설정돼 있으면 그대로 사용됩니다.
              없으면 설정에서 직접 입력하세요 →
            </p>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Flame size={18} className="text-orange-400" />}
          value={`${stats.currentStreak}일`}
          label="연속 학습"
          bg="bg-orange-900/20 border-orange-800/50"
        />
        <StatCard
          icon={<Target size={18} className="text-violet-400" />}
          value={stats.totalSessions.toString()}
          label="총 세션"
          bg="bg-violet-900/20 border-violet-800/50"
        />
        <StatCard
          icon={<span className="text-lg">⭐</span>}
          value={stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '--'}
          label="평균 점수"
          bg="bg-yellow-900/20 border-yellow-800/50"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <FilterChip
          active={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
        >
          전체
        </FilterChip>
        {TOPIC_CATEGORIES.map((cat) => (
          <FilterChip
            key={cat.id}
            active={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id as TopicCategory)}
          >
            {cat.emoji} {cat.labelKo}
          </FilterChip>
        ))}
      </div>

      {/* Topic grid */}
      <div className="space-y-3">
        {filtered.map((topic) => (
          <button
            key={topic.id}
            onClick={() => navigate(`/conversation/${topic.id}`)}
            className="w-full text-left card p-4 hover:border-gray-700 hover:bg-gray-800/80 transition-all duration-200 group"
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className={clsx(
                  'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 bg-gradient-to-br',
                  topic.gradient
                )}
              >
                {topic.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-gray-100">{topic.nameKo}</h3>
                  <span
                    className={clsx(
                      topic.difficulty === 'beginner' && 'badge-beginner',
                      topic.difficulty === 'intermediate' && 'badge-intermediate',
                      topic.difficulty === 'advanced' && 'badge-advanced'
                    )}
                  >
                    {topic.difficulty === 'beginner'
                      ? '입문'
                      : topic.difficulty === 'intermediate'
                      ? '중급'
                      : '고급'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{topic.name}</p>
                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{topic.description}</p>
              </div>

              <ChevronRight
                size={18}
                className="text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 mt-1"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  bg,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  bg: string;
}) {
  return (
    <div className={clsx('border rounded-xl p-3 text-center', bg)}>
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="font-bold text-gray-100">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'whitespace-nowrap text-sm px-3.5 py-1.5 rounded-full border transition-colors',
        active
          ? 'bg-violet-600 border-violet-500 text-white'
          : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
      )}
    >
      {children}
    </button>
  );
}
