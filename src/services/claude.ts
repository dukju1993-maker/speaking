import type { Topic, Analysis, Message, UserLevel, LevelTestResult } from '../types';

const API_URL = '/api/anthropic';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callAnthropic(
  apiKey: string | undefined,
  system: string,
  messages: AnthropicMessage[],
  maxTokens = 1200
): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(apiKey && { apiKey }),
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ?? res.statusText
    );
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const block = data.content?.[0];
  if (block?.type !== 'text') throw new Error('Unexpected response format');
  return block.text;
}

// ─── Level config ────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<UserLevel, {
  labelKo: string;
  replyGuide: string;
  correctionGuide: string;
}> = {
  beginner: {
    labelKo: '입문',
    replyGuide: '아주 짧고 단순하게 대답해요 (1~2문장). 일상적인 단어만 사용하고, 천천히 또렷하게 말하는 느낌으로 써주세요. 학습자가 이해할 수 있도록 쉬운 단어를 선택하세요.',
    correctionGuide: '가장 중요한 오류 1개만 교정해주세요. 칭찬을 먼저 하고 부드럽게 알려주세요.',
  },
  elementary: {
    labelKo: '초급',
    replyGuide: '2~3문장으로 답하세요. 흔히 쓰는 어휘 위주로, 조금 쉬운 문장 구조를 사용해주세요.',
    correctionGuide: '1~2개 오류를 교정해주세요. 격려와 함께 구체적인 설명을 곁들여 주세요.',
  },
  intermediate: {
    labelKo: '중급',
    replyGuide: '2~4문장으로 자연스럽게 답하세요. 일반적인 비즈니스 어휘와 자연스러운 표현을 사용하세요.',
    correctionGuide: '중요한 오류 1~3개를 교정하고, 더 자연스러운 표현도 제안해주세요.',
  },
  'upper-intermediate': {
    labelKo: '중상급',
    replyGuide: '2~4문장으로 답하되 풍부한 어휘와 관용 표현을 자유롭게 써주세요. 원어민 속도로 자연스럽게 대화하세요.',
    correctionGuide: '문법보다 자연스러움과 어휘 선택에 집중해서 교정해주세요. 전문적인 표현으로 격상시켜 주세요.',
  },
  advanced: {
    labelKo: '고급',
    replyGuide: '원어민처럼 자연스럽게 답하세요. 복잡한 문장 구조, 관용어, 비즈니스 용어를 자유롭게 사용하세요.',
    correctionGuide: '매우 미묘한 부자연스러움이나 어색한 표현만 교정해주세요. 원어민이 실제로 쓰는 표현과의 차이를 설명해주세요.',
  },
};

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(topic: Topic, level: UserLevel): string {
  const cfg = LEVEL_CONFIG[level];

  return `You are having a real conversation. You happen to also be great at helping Korean professionals improve their English — but first and foremost, you're a real person in this scenario.

## Who you are right now
${topic.scenario}

## Your conversational style
Stay fully in character. React like a real human would — surprised, curious, amused, direct, whatever fits the moment. Don't always be perfectly polite or positive. If the learner says something surprising, react to it. Keep it real.

${cfg.replyGuide}

---

## After each message, also include an analysis (in Korean)
${cfg.correctionGuide}

### 한국인이 자주 틀리는 것 (우선 집중)
- 관사 (a/an/the) — 한국어에 없어서 자주 빠뜨림
- 전치사 (in/on/at/for/by) — 한국어 조사와 매핑이 다름
- 시제 — 현재완료 vs 과거, 진행형 혼동
- 직역 표현 — 한국어를 그대로 영어로 옮긴 어색한 문장
- 주어 생략 — 한국어 습관
- 단복수 혼동

---

## 반드시 이 JSON 형식으로만 응답 (마크다운 없이)

{
  "reply": "시나리오 속 당신으로서 자연스럽고 인간적인 영어 대화 응답",
  "analysis": {
    "hasErrors": true 또는 false,
    "correctedText": "학습자 문장의 완전한 교정 버전",
    "errors": [
      {
        "type": "grammar | vocabulary | naturalness | spelling",
        "original": "틀린 부분",
        "correction": "올바른 표현",
        "explanation": "왜 틀렸는지, 어떻게 기억하면 좋은지 한국어로 자연스럽게 설명"
      }
    ],
    "score": 1~10,
    "feedback": "학습자에게 한국어로 따뜻하고 구체적인 피드백 한 마디",
    "betterExpressions": ["더 자연스럽거나 세련된 표현 1", "대안 표현 2"]
  }
}

## 점수 기준
10: 완벽한 원어민 수준 / 8~9: 충분히 자연스럽고 유창함 / 6~7: 의미 전달되나 어색함 / 4~5: 여러 오류 / 1~3: 심각한 오류`;
}

// ─── Level test prompt ────────────────────────────────────────────────────────

const LEVEL_TEST_QUESTIONS = [
  {
    id: 1,
    prompt: 'Please introduce yourself — your name, what you do, and something you enjoy outside of work.',
    promptKo: '자기 소개를 해보세요 — 이름, 하는 일, 취미나 좋아하는 것 하나.',
  },
  {
    id: 2,
    prompt: 'Describe a typical workday for you. What kinds of tasks or challenges do you usually deal with?',
    promptKo: '평소 하루 업무를 설명해보세요. 주로 어떤 일을 하나요?',
  },
  {
    id: 3,
    prompt: 'Tell me about a difficult situation you faced — at work or in life — and how you handled it.',
    promptKo: '어려웠던 상황과 그것을 어떻게 해결했는지 이야기해보세요.',
  },
  {
    id: 4,
    prompt: "What's your opinion on AI's impact on jobs over the next 10 years? Do you see it as a threat or an opportunity?",
    promptKo: 'AI가 앞으로 10년간 일자리에 미칠 영향에 대해 어떻게 생각하나요?',
  },
];

export { LEVEL_TEST_QUESTIONS };

async function evaluateLevel(
  apiKey: string | undefined,
  responses: Array<{ questionId: number; text: string }>
): Promise<LevelTestResult> {
  const formatted = responses
    .map((r) => {
      const q = LEVEL_TEST_QUESTIONS.find((q) => q.id === r.questionId);
      return `Q${r.questionId}: ${q?.prompt}\nAnswer: ${r.text}`;
    })
    .join('\n\n');

  const system = `You are an expert English proficiency assessor specializing in Korean learners.
Evaluate the 4 responses and determine the learner's English level.

Respond ONLY with valid JSON (no markdown):
{
  "level": "beginner | elementary | intermediate | upper-intermediate | advanced",
  "levelKo": "입문 | 초급 | 중급 | 중상급 | 고급",
  "cefrLevel": "A1-A2 | B1 | B2 | C1 | C2",
  "overallScore": 1-10,
  "strengths": ["강점 (한국어로)", "강점2"],
  "weaknesses": ["약점 (한국어로)", "약점2"],
  "recommendedTopicIds": ["topic-id-1", "topic-id-2", "topic-id-3"],
  "studyTips": "이 학습자에게 가장 효과적인 학습 방법을 한국어로 2~3문장으로 설명"
}

Available topic IDs: business-meeting, job-interview, presentation, negotiation, networking, client-call, small-talk, travel, restaurant, debate, news-discussion, free-talk

Level criteria:
- beginner (A1-A2): Very basic sentences, many fundamental errors
- elementary (B1): Simple sentences, common vocabulary, basic grammar mostly correct
- intermediate (B2): Can discuss most topics, some grammar/naturalness issues
- upper-intermediate (C1): Fluent with occasional advanced errors, good range
- advanced (C2): Near-native, only subtle naturalness or nuance issues`;

  const text = await callAnthropic(
    apiKey,
    system,
    [{ role: 'user', content: `Please evaluate these 4 English responses:\n\n${formatted}` }],
    800
  );

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('레벨 평가 응답 형식 오류');
  const parsed = JSON.parse(jsonMatch[0]) as Omit<LevelTestResult, 'testedAt'>;
  return { ...parsed, testedAt: new Date().toISOString() };
}

export { evaluateLevel };

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ClaudeResponse {
  reply: string;
  analysis: Analysis & { hasErrors: boolean };
}

export async function startConversation(
  apiKey: string | undefined,
  topic: Topic,
  level: UserLevel
): Promise<string> {
  const text = await callAnthropic(
    apiKey,
    buildSystemPrompt(topic, level),
    [{
      role: 'user',
      content: '[대화 시작] 시나리오 속 당신으로서, 자연스럽고 현실감 있는 첫 마디로 대화를 열어주세요. JSON 없이 영어 텍스트만 출력하세요.',
    }],
    250
  );

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { reply?: string };
      return parsed.reply ?? text;
    }
  } catch { /* not JSON */ }
  return text;
}

export async function sendMessage(
  apiKey: string | undefined,
  topic: Topic,
  level: UserLevel,
  history: Message[],
  userMessage: string
): Promise<ClaudeResponse> {
  const pastMessages: AnthropicMessage[] = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-12)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  pastMessages.push({ role: 'user', content: userMessage });

  const text = await callAnthropic(apiKey, buildSystemPrompt(topic, level), pastMessages);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('응답 형식 오류. 다시 시도해주세요.');

  const parsed = JSON.parse(jsonMatch[0]) as {
    reply?: string;
    analysis?: {
      hasErrors?: boolean;
      correctedText?: string;
      errors?: Array<{ type: string; original: string; correction: string; explanation: string }>;
      score?: number;
      feedback?: string;
      betterExpressions?: string[];
    };
  };

  return {
    reply: parsed.reply ?? '',
    analysis: {
      hasErrors: parsed.analysis?.hasErrors ?? false,
      correctedText: parsed.analysis?.correctedText ?? userMessage,
      errors: (parsed.analysis?.errors ?? []).map((e) => ({
        type: e.type as 'grammar' | 'vocabulary' | 'naturalness' | 'spelling',
        original: e.original,
        correction: e.correction,
        explanation: e.explanation,
      })),
      score: parsed.analysis?.score ?? 8,
      feedback: parsed.analysis?.feedback ?? '잘 하셨어요!',
      betterExpressions: parsed.analysis?.betterExpressions ?? [],
    },
  };
}
