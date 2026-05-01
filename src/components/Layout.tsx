import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, History, BarChart2, Settings, Mic } from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { to: '/', icon: Home, label: '홈' },
  { to: '/history', icon: History, label: '기록' },
  { to: '/progress', icon: BarChart2, label: '진도' },
  { to: '/settings', icon: Settings, label: '설정' },
];

export default function Layout() {
  const { pathname } = useLocation();
  const isConversation = pathname.startsWith('/conversation');

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      {!isConversation && (
        <header className="flex items-center gap-2 px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
              <Mic size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white">SpeakAI</span>
          </div>
          <span className="text-xs text-gray-500 ml-1 mt-0.5">영어 스피킹 트레이너</span>
        </header>
      )}

      {/* Page content */}
      <main className={clsx('flex-1 overflow-y-auto', !isConversation && 'pb-20')}>
        <Outlet />
      </main>

      {/* Bottom nav */}
      {!isConversation && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-gray-950 border-t border-gray-800 flex">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center gap-1 py-3 transition-colors text-xs',
                  isActive ? 'text-violet-400' : 'text-gray-500 hover:text-gray-300'
                )
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
