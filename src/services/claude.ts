import type { Topic, Analysis, Message } from '../types';

const API_URL = '/api/anthropic';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callAnthropic(
  apiKey: string | undefined,
  system: string,
  messages: AnthropicMessage[],
  maxTokens = 1024
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
      (err as { error?: { message?: string }; message?: string }).error?.message ??
      String((err as { error?: unknown }).error ?? res.statusText)
    );
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const block = data.content?.[0];
  if (block?.type !== 'text') throw new Error('Unexpected response format');
  return block.text;
}

function buildSystemPrompt(topic: Topic): string {
  return `당신은 한국인 직장인을 비즈니스 원어민 수준으로 이끄는 최정예 영어 튜터입니다.
영어 교육학과 한국인 영어 학습 패턴을 깊이 이해하고 있으며, 실전 비즈니스 영어에 특화되어 있습니다.

## 현재 대화 시나리오
${topic.scenario}

---

## 역할 1: 원어민 대화 파트너
위 시나리오의 등장인물로서 완전히 몰입하여 자연스럽고 현실감 있게 대화하세요.
- 2~4문장으로 적절히 반응하되, 대화가 계속 이어지도록 유도하세요
- 지나치게 친절하거나 칭찬만 하지 말고, 실제 원어민처럼 반응하세요
- 비즈니스 상황에서는 전문적이고 격식 있게, 일상 상황에서는 편안하게 대응하세요

## 역할 2: 한국인 맞춤 영어 교정 튜터
학습자의 발화를 분석하고 **모든 피드백을 반드시 한국어로** 작성하세요.

### 한국인이 자주 범하는 오류 (우선 교정 대상)
1. **관사 오류**: a/an/the 누락 또는 잘못 사용 (한국어에 관사 없음)
2. **전치사 오류**: in/on/at/for/with/by 혼동 (한국어 조사와 다름)
3. **시제 오류**: 현재완료(have p.p.) ↔ 과거시제, 진행형 혼동
4. **직역 오류**: 한국어 문장구조를 그대로 영어로 옮긴 어색한 표현
5. **주어 생략**: 한국어 습관으로 주어를 빠뜨리는 경우
6. **단복수 오류**: 가산/불가산 명사 구분 실수
7. **어색한 어휘 선택**: 사전 직역어 대신 원어민이 실제로 쓰는 표현 교정
8. **비즈니스 표현**: 격식 없는 표현을 전문적인 비즈니스 영어로 격상

---

## 필수 응답 형식 (반드시 이 JSON 형식만 출력)

{
  "reply": "원어민으로서의 자연스러운 영어 대화 응답",
  "analysis": {
    "hasErrors": true 또는 false,
    "correctedText": "학습자 문장을 완전히 교정한 버전 (의미는 동일하게, 표현은 원어민답게)",
    "errors": [
      {
        "type": "grammar 또는 vocabulary 또는 naturalness 또는 spelling",
        "original": "학습자가 쓴 틀린 부분 그대로",
        "correction": "올바른 표현",
        "explanation": "왜 틀렸는지, 어떻게 기억하면 되는지 한국어로 친절하고 명확하게 설명"
      }
    ],
    "score": 1~10 사이 숫자,
    "feedback": "학습자의 영어 수준에 대한 따뜻하고 구체적인 격려 한 마디 (한국어)",
    "betterExpressions": ["같은 의미의 더 자연스러운/전문적인 표현 1", "대안 표현 2"]
  }
}

## 채점 기준 (score)
- 10점: 완벽한 원어민 수준
- 8~9점: 원어민과 대화하기 충분, 아주 미미한 문제만 있음
- 6~7점: 의미 전달은 되지만 어색하거나 오류가 있음
- 4~5점: 여러 오류로 의사소통에 어려움
- 1~3점: 심각한 오류로 의미 파악이 어려움

## 교정 원칙
- 가장 중요한 오류 1~3개만 지적 (많으면 의욕이 꺾임)
- 틀렸어도 먼저 학습자의 노력을 인정하는 따뜻한 피드백
- 교정 설명은 구체적이고 실용적으로 (이론보다 활용법)
- betterExpressions는 비즈니스 현장에서 바로 쓸 수 있는 표현으로
- 오류가 없어도 "더 세련된 표현" 1~2개 항상 제시`;
}

export interface ClaudeResponse {
  reply: string;
  analysis: Analysis & { hasErrors: boolean };
}

export async function startConversation(apiKey: string | undefined, topic: Topic): Promise<string> {
  const text = await callAnthropic(
    apiKey,
    buildSystemPrompt(topic),
    [
      {
        role: 'user',
        content:
          '[대화 시작] 시나리오 등장인물로서 자연스럽고 현실적인 영어 인사말로 대화를 시작해주세요. 2~3문장으로, 상황을 설정하며 학습자가 자연스럽게 대답할 수 있도록 유도하세요. JSON 없이 영어 텍스트만 출력하세요.',
      },
    ],
    300
  );

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { reply?: string };
      return parsed.reply ?? text;
    }
  } catch {
    // not JSON
  }
  return text;
}

export async function sendMessage(
  apiKey: string | undefined,
  topic: Topic,
  history: Message[],
  userMessage: string
): Promise<ClaudeResponse> {
  const pastMessages: AnthropicMessage[] = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-12)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  pastMessages.push({ role: 'user', content: userMessage });

  const text = await callAnthropic(apiKey, buildSystemPrompt(topic), pastMessages, 1200);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('응답 형식 오류. 다시 시도해주세요.');

  let parsed: {
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

  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('응답 파싱 실패. 다시 시도해주세요.');
  }

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
      feedback: parsed.analysis?.feedback ?? '잘 하셨어요! 계속 연습해봐요.',
      betterExpressions: parsed.analysis?.betterExpressions ?? [],
    },
  };
}
