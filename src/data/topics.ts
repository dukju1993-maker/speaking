import type { Topic } from '../types';

export const TOPICS: Topic[] = [
  // ── Business ──────────────────────────────────────────────────────────────
  {
    id: 'business-meeting',
    name: 'Business Meeting',
    nameKo: '비즈니스 미팅',
    description: '회의 진행, 의견 제시, 합의 도출 연습',
    category: 'business',
    difficulty: 'intermediate',
    scenario:
      'You are attending a quarterly business review meeting with international colleagues. The team is discussing Q3 performance and planning Q4 strategy. I am Sarah, the VP of Marketing from the US headquarters.',
    icon: '💼',
    gradient: 'from-blue-600 to-blue-800',
  },
  {
    id: 'job-interview',
    name: 'Job Interview',
    nameKo: '취업 면접',
    description: '영어 면접 준비 및 실전 대화 연습',
    category: 'business',
    difficulty: 'advanced',
    scenario:
      'You are interviewing for a Senior Product Manager position at a top Silicon Valley tech company. This is a behavioral and situational interview. I am Alex, the Director of Product.',
    icon: '🎯',
    gradient: 'from-violet-600 to-violet-800',
  },
  {
    id: 'presentation',
    name: 'Presentation',
    nameKo: '발표 & 프레젠테이션',
    description: '영어 발표 스킬과 질의응답 연습',
    category: 'business',
    difficulty: 'advanced',
    scenario:
      'You are presenting your team\'s quarterly roadmap to senior leadership and international stakeholders. I am James, the CTO, who will ask questions about your proposal.',
    icon: '📊',
    gradient: 'from-cyan-600 to-cyan-800',
  },
  {
    id: 'negotiation',
    name: 'Negotiation',
    nameKo: '협상',
    description: '비즈니스 협상 전략과 설득력 있는 대화',
    category: 'business',
    difficulty: 'advanced',
    scenario:
      'You are negotiating a software licensing deal with a potential client. They want a 40% discount but your floor is 15%. I am Tom, the procurement manager from the client side.',
    icon: '🤝',
    gradient: 'from-emerald-600 to-emerald-800',
  },
  {
    id: 'networking',
    name: 'Networking Event',
    nameKo: '네트워킹',
    description: '비즈니스 네트워킹 이벤트에서 자연스러운 대화',
    category: 'business',
    difficulty: 'intermediate',
    scenario:
      'You are at a tech industry networking event in San Francisco. There are professionals from various companies. I am Rachel, a startup founder who is curious about your background.',
    icon: '🌐',
    gradient: 'from-orange-600 to-orange-800',
  },
  {
    id: 'client-call',
    name: 'Client Call',
    nameKo: '클라이언트 통화',
    description: '영어로 고객과 미팅 및 문제 해결',
    category: 'business',
    difficulty: 'intermediate',
    scenario:
      'You are on a video call with an important overseas client who has concerns about project delays and quality issues. I am Michael, the client\'s account manager.',
    icon: '📞',
    gradient: 'from-rose-600 to-rose-800',
  },
  // ── Daily ─────────────────────────────────────────────────────────────────
  {
    id: 'small-talk',
    name: 'Small Talk',
    nameKo: '일상 대화',
    description: '원어민과 자연스러운 일상 대화 연습',
    category: 'daily',
    difficulty: 'beginner',
    scenario:
      'You just moved to a new city and you\'re getting to know your American neighbor. We\'re chatting over the fence on a Sunday afternoon. I am your neighbor, Chris.',
    icon: '☕',
    gradient: 'from-amber-500 to-amber-700',
  },
  {
    id: 'travel',
    name: 'Travel',
    nameKo: '여행 영어',
    description: '공항, 호텔, 관광지에서 영어 대화',
    category: 'daily',
    difficulty: 'beginner',
    scenario:
      'You have just arrived at JFK Airport in New York and are navigating through customs, finding your hotel, and asking for recommendations. I am the hotel concierge, Jenny.',
    icon: '✈️',
    gradient: 'from-sky-500 to-sky-700',
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    nameKo: '레스토랑',
    description: '식당에서 주문, 음식 묘사, 불만 처리',
    category: 'daily',
    difficulty: 'beginner',
    scenario:
      'You are dining at a fine American restaurant in New York for the first time. You want to ask about the menu, make special requests, and chat with the waiter. I am your waiter, Daniel.',
    icon: '🍽️',
    gradient: 'from-red-500 to-red-700',
  },
  // ── Advanced ──────────────────────────────────────────────────────────────
  {
    id: 'debate',
    name: 'Debate & Opinion',
    nameKo: '토론 & 의견 나누기',
    description: '복잡한 주제로 논리적 토론 및 의견 표현',
    category: 'advanced',
    difficulty: 'advanced',
    scenario:
      'We are having an intellectual debate about the impact of AI on the future of work. You need to clearly articulate your position and respond to counterarguments. I am a professor of economics taking the opposing view.',
    icon: '🗣️',
    gradient: 'from-pink-600 to-pink-800',
  },
  {
    id: 'news-discussion',
    name: 'News Discussion',
    nameKo: '시사 토론',
    description: '최신 뉴스와 글로벌 이슈 토론',
    category: 'advanced',
    difficulty: 'advanced',
    scenario:
      'You are discussing current global technology and business news with a colleague. Topics may include AI regulations, market trends, geopolitics, and innovation. I am your American colleague, Dr. Kim.',
    icon: '📰',
    gradient: 'from-indigo-600 to-indigo-800',
  },
  {
    id: 'free-talk',
    name: 'Free Talk',
    nameKo: '자유 대화',
    description: '주제 없이 자유롭게 대화하며 실력 향상',
    category: 'advanced',
    difficulty: 'intermediate',
    scenario:
      'This is an open-ended conversation session. We can talk about anything you want — your interests, experiences, opinions, plans, or any topic you choose. I am Jamie, your friendly English conversation partner.',
    icon: '💬',
    gradient: 'from-teal-600 to-teal-800',
  },
];

export const TOPIC_CATEGORIES = [
  { id: 'business', label: 'Business English', labelKo: '비즈니스 영어', emoji: '💼' },
  { id: 'daily', label: 'Daily English', labelKo: '일상 영어', emoji: '🌟' },
  { id: 'advanced', label: 'Advanced', labelKo: '고급', emoji: '🚀' },
] as const;
