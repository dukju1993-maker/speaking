import { create } from 'zustand';
import type { AppSettings, ConversationSession, UserStats } from './types';
import { storage } from './services/storage';

interface AppStore {
  settings: AppSettings;
  sessions: ConversationSession[];
  stats: UserStats;
  currentSession: ConversationSession | null;

  setSettings: (s: Partial<AppSettings>) => void;
  setSessions: (sessions: ConversationSession[]) => void;
  setStats: (stats: UserStats) => void;
  setCurrentSession: (session: ConversationSession | null) => void;
  saveCurrentSession: () => void;
  loadFromStorage: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  settings: storage.getSettings(),
  sessions: storage.getSessions(),
  stats: storage.getStats(),
  currentSession: null,

  setSettings: (partial) => {
    const next = { ...get().settings, ...partial };
    storage.saveSettings(next);
    set({ settings: next });
  },

  setSessions: (sessions) => set({ sessions }),

  setStats: (stats) => {
    storage.saveStats(stats);
    set({ stats });
  },

  setCurrentSession: (session) => set({ currentSession: session }),

  saveCurrentSession: () => {
    const { currentSession } = get();
    if (!currentSession) return;
    storage.saveSession(currentSession);
    storage.updateStats(currentSession);
    set({
      sessions: storage.getSessions(),
      stats: storage.getStats(),
      currentSession: null,
    });
  },

  loadFromStorage: () => {
    set({
      settings: storage.getSettings(),
      sessions: storage.getSessions(),
      stats: storage.getStats(),
    });
  },
}));
