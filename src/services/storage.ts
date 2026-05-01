import type { ConversationSession, UserStats, AppSettings, Message } from '../types';

const KEYS = {
  sessions: 'speakai_sessions',
  stats: 'speakai_stats',
  settings: 'speakai_settings',
} as const;

const DEFAULT_STATS: UserStats = {
  totalSessions: 0,
  totalMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastSessionDate: null,
  errorsFixed: 0,
  avgScore: 0,
  sessionsThisWeek: 0,
  topicsExplored: [],
};

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  voiceEnabled: true,
  autoSpeak: true,
  speakingRate: 0.95,
  voicePitch: 1.0,
  preferredVoice: '',
  targetAccent: 'american',
};

function deserializeMessage(m: Record<string, unknown>): Message {
  return {
    ...(m as Omit<Message, 'timestamp'>),
    timestamp: new Date(m.timestamp as string),
  };
}

function deserializeSession(s: Record<string, unknown>): ConversationSession {
  const raw = s as Omit<ConversationSession, 'startedAt' | 'endedAt' | 'messages'> & {
    startedAt: string;
    endedAt?: string;
    messages: Record<string, unknown>[];
  };
  return {
    ...raw,
    startedAt: new Date(raw.startedAt),
    endedAt: raw.endedAt ? new Date(raw.endedAt) : undefined,
    messages: raw.messages.map(deserializeMessage),
  };
}

export const storage = {
  getSessions(): ConversationSession[] {
    try {
      const data = localStorage.getItem(KEYS.sessions);
      if (!data) return [];
      return (JSON.parse(data) as Record<string, unknown>[]).map(deserializeSession);
    } catch {
      return [];
    }
  },

  saveSession(session: ConversationSession): void {
    const sessions = this.getSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.unshift(session);
    localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
  },

  deleteSession(id: string): void {
    const sessions = this.getSessions().filter((s) => s.id !== id);
    localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
  },

  getStats(): UserStats {
    try {
      const data = localStorage.getItem(KEYS.stats);
      if (!data) return { ...DEFAULT_STATS };
      return { ...DEFAULT_STATS, ...JSON.parse(data) };
    } catch {
      return { ...DEFAULT_STATS };
    }
  },

  saveStats(stats: UserStats): void {
    localStorage.setItem(KEYS.stats, JSON.stringify(stats));
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(KEYS.settings);
      if (!data) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  },

  updateStats(session: ConversationSession): void {
    const stats = this.getStats();
    const today = new Date().toISOString().split('T')[0];
    const lastDate = stats.lastSessionDate;

    let streak = stats.currentStreak;
    if (lastDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      if (lastDate === today) {
        // same day, no streak change
      } else if (lastDate === yStr) {
        streak += 1;
      } else {
        streak = 1;
      }
    } else {
      streak = 1;
    }

    const allScores = session.messages
      .filter((m) => m.role === 'user' && m.analysis?.score)
      .map((m) => m.analysis!.score);
    const sessionAvg = allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

    const totalSessions = stats.totalSessions + 1;
    const newAvg = stats.avgScore > 0
      ? (stats.avgScore * stats.totalSessions + sessionAvg) / totalSessions
      : sessionAvg;

    const topicsExplored = stats.topicsExplored.includes(session.topicId)
      ? stats.topicsExplored
      : [...stats.topicsExplored, session.topicId];

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    this.saveStats({
      totalSessions,
      totalMinutes: stats.totalMinutes + (session.stats.duration || 0),
      currentStreak: streak,
      longestStreak: Math.max(stats.longestStreak, streak),
      lastSessionDate: today,
      errorsFixed: stats.errorsFixed + session.stats.errorsFound,
      avgScore: Math.round(newAvg * 10) / 10,
      sessionsThisWeek: stats.sessionsThisWeek + 1,
      topicsExplored,
    });
  },
};
