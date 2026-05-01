import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Flame, Target, ClipboardList } from 'lucide-react';
import clsx from 'clsx';
import { TOPICS, TOPIC_CATEGORIES } from '../data/topics';
import { useAppStore } from '../store';
import type { TopicCategory, UserLevel } from '../types';

const LEVEL_LABEL: Record<UserLevel, string> = {
  beginner: '입문', elementary: '초급', intermediate: '중급',
  'upper-intermediate': '중상급', advanced: '고급',
};
const LEVEL_COLOR: Record<UserLevel, string> = {
  beginner: 'text-green-400 bg-green-900/30 border-green-800',
  elementary: 'text-blue-400 bg-blue-900/30 border-blue-800',
  intermediate: 'text-yellow-400 bg-yellow-900/30 border-yellow-800',
  'upper-intermediate': 'text-orange-400 bg-orange-900/30 border-orange-800',
  advanced: 'text-violet-400 bg-violet-900/30 border-violet-800',
};

export default function HomePage() {
  const navigate = useNavigate();
  const { stats, settings } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<TopicCategory | 'all'>('all');

  const filtered = activeCategory === 'all' ? TOPICS : TOPICS.filter((t) => t.category === activeCategory);

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Level banner */}
      <div
        className={clsx('flex items-center justify-between border rounded-xl px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity', LEVEL_COLOR[settings.userLevel])}
        onClick={() => navigate('/level-test')}
      >
        <div className="flex items-center gap-2.5">
          <ClipboardList size={16} />
          <div>
            <p className="text-xs opacity-70">현재 레벨</p>
            <p className="font-semibold text-sm">{LEVEL_LABEL[settings.userLevel]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs opacity-70">
          <span>{settings.levelResult ? '레벨 재테스트' : '레벨 테스트 시작'}</span>
          <ChevronRight size={14} />
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Flame size={18} className="text-orange-400" />} value={`${stats.currentStreak}일`} label="연속 학습" bg="bg-orange-900/20 border-orange-800/50" />
        <StatCard icon={<Target size={18} className="text-violet-400" />} value={stats.totalSessions.toString()} label="총 세션" bg="bg-violet-900/20 border-violet-800/50" />
        <StatCard icon={<span className="text-lg">⭐</span>} value={stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '--'} label="평균 점수" bg="bg-yellow-900/20 border-yellow-800/50" />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>전체</FilterChip>
        {TOPIC_CATEGORIES.map((cat) => (
          <FilterChip key={cat.id} active={activeCategory === cat.id} onClick={() => setActiveCategory(cat.id as TopicCategory)}>
            {cat.emoji} {cat.labelKo}
          </FilterChip>
        ))}
      </div>

      {/* Topic list */}
      <div className="space-y-3">
        {filtered.map((topic) => (
          <button
            key={topic.id}
            onClick={() => navigate(`/conversation/${topic.id}`)}
            className="w-full text-left card p-4 hover:border-gray-700 hover:bg-gray-800/80 transition-all duration-200 group"
          >
            <div className="flex items-start gap-4">
              <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 bg-gradient-to-br', topic.gradient)}>
                {topic.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-gray-100">{topic.nameKo}</h3>
                  <span className={clsx(
                    topic.difficulty === 'beginner' && 'badge-beginner',
                    topic.difficulty === 'intermediate' && 'badge-intermediate',
                    topic.difficulty === 'advanced' && 'badge-advanced'
                  )}>
                    {topic.difficulty === 'beginner' ? '입문' : topic.difficulty === 'intermediate' ? '중급' : '고급'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{topic.name}</p>
                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{topic.description}</p>
              </div>
              <ChevronRight size={18} className="text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, bg }: { icon: React.ReactNode; value: string; label: string; bg: string }) {
  return (
    <div className={clsx('border rounded-xl p-3 text-center', bg)}>
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="font-bold text-gray-100">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={clsx(
      'whitespace-nowrap text-sm px-3.5 py-1.5 rounded-full border transition-colors',
      active ? 'bg-violet-600 border-violet-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
    )}>
      {children}
    </button>
  );
}
