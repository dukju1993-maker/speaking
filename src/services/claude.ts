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
      ...(apiKey && { apiKey }), // omit if empty — server uses env var
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
  return `You are a native English-speaking conversation partner helping a Korean professional master business and everyday English.

## Your Persona
${topic.scenario}

## Your Dual Role
1. **Conversation Partner**: Respond naturally and engagingly as the character described above. Keep replies 2-4 sentences — realistic and immersive.
2. **English Coach**: Analyze the learner's message for grammar, vocabulary, and naturalness issues.

## REQUIRED OUTPUT FORMAT
You MUST respond ONLY with valid JSON in exactly this structure (no markdown, no text outside JSON):

{
  "reply": "Your natural conversational response as the character",
  "analysis": {
    "hasErrors": true,
    "correctedText": "The user's full sentence rewritten correctly (same meaning, better form)",
    "errors": [
      {
        "type": "grammar",
        "original": "the exact problematic phrase from user input",
        "correction": "the corrected version",
        "explanation": "Clear, friendly 1-sentence explanation"
      }
    ],
    "score": 8,
    "feedback": "One warm, encouraging sentence about their English performance",
    "betterExpressions": ["A more natural/professional alternative", "Another option"]
  },
  "followUps": ["Suggested question or response the user could try next"]
}

## Error Types
- grammar: Wrong verb form, tense, subject-verb agreement, articles, prepositions
- vocabulary: Wrong word choice or non-standard word
- naturalness: Grammatically OK but sounds unnatural or too literal from Korean
- spelling: Typos or misspellings

## Scoring Guide
- 10: Perfect native-level English
- 8-9: Good with very minor or stylistic issues only
- 6-7: Understandable but with noticeable grammar or naturalness issues
- 4-5: Several errors that affect clarity
- 1-3: Major errors that impede understanding

## Guidelines
- Focus on the TOP 1-3 most important errors only (don't overwhelm)
- Always complete correctedText even if there are no errors (polished version)
- betterExpressions shows more natural/professional phrasing — always provide 1-2 examples
- Be encouraging — this person is working hard to improve
- If user input is a single word or very short, still analyze it properly`;
}

export interface ClaudeResponse {
  reply: string;
  analysis: Analysis & { hasErrors: boolean };
  followUps: string[];
}

export async function startConversation(apiKey: string | undefined, topic: Topic): Promise<string> {
  const text = await callAnthropic(
    apiKey,
    buildSystemPrompt(topic),
    [
      {
        role: 'user',
        content:
          '[SESSION START] Begin the conversation scenario naturally. Greet me as the character and set up the scene in 2-3 engaging sentences. Respond with ONLY the plain greeting text — no JSON needed for this opening message.',
      },
    ],
    400
  );

  // Opening may or may not be JSON — extract reply if JSON
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { reply?: string };
      return parsed.reply ?? text;
    }
  } catch {
    // not JSON, use raw text
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

  const text = await callAnthropic(apiKey, buildSystemPrompt(topic), pastMessages, 1024);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude returned an unexpected format. Please try again.');

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
    followUps?: string[];
  };

  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse response. Please try again.');
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
      feedback: parsed.analysis?.feedback ?? 'Good effort! Keep it up.',
      betterExpressions: parsed.analysis?.betterExpressions ?? [],
    },
    followUps: parsed.followUps ?? [],
  };
}
