export type TopicCategory = 'business' | 'daily' | 'advanced';
export type TopicDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ErrorType = 'grammar' | 'vocabulary' | 'naturalness' | 'spelling';
export type MessageRole = 'user' | 'assistant';
export type TargetAccent = 'american' | 'british';
export type VoiceType = 'female' | 'male' | 'gentle';
export type UserLevel = 'beginner' | 'elementary' | 'intermediate' | 'upper-intermediate' | 'advanced';

export interface Topic {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  category: TopicCategory;
  difficulty: TopicDifficulty;
  scenario: string;
  icon: string;
  gradient: string;
}

export interface GrammarError {
  type: ErrorType;
  original: string;
  correction: string;
  explanation: string;
}

export interface Analysis {
  hasErrors: boolean;
  correctedText: string;
  errors: GrammarError[];
  score: number;
  feedback: string;
  betterExpressions: string[];
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  analysis?: Analysis;
}

export interface SessionStats {
  totalMessages: number;
  errorsFound: number;
  avgScore: number;
  duration: number;
}

export interface ConversationSession {
  id: string;
  topicId: string;
  topicName: string;
  topicIcon: string;
  messages: Message[];
  startedAt: Date;
  endedAt?: Date;
  stats: SessionStats;
}

export interface UserStats {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string | null;
  errorsFixed: number;
  avgScore: number;
  sessionsThisWeek: number;
  topicsExplored: string[];
}

export interface LevelTestResult {
  level: UserLevel;
  levelKo: string;
  cefrLevel: string;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendedTopicIds: string[];
  studyTips: string;
  testedAt: string;
}

export interface AppSettings {
  voiceEnabled: boolean;
  autoSpeak: boolean;
  speakingRate: number;
  voiceType: VoiceType;
  targetAccent: TargetAccent;
  userLevel: UserLevel;
  levelResult: LevelTestResult | null;
}
