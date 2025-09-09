import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

type ExplainParams = {
  riskScore: number;
  heuristics: Array<{ rule: string; impact: number; detail?: string }>;
  chosen: 'blocked' | 'stripe' | 'paypal' | 'unknown';
  amount: number;
  currency: string;
  email: string;
};

const cache = new Map<string, string>();

export async function explainRisk(p: ExplainParams): Promise<string> {
  const key = JSON.stringify({
    r: Math.round(p.riskScore * 100) / 100,
    h: p.heuristics.map(h => h.rule).sort(),
    c: p.chosen,
    a: p.amount,
    cur: p.currency,
    e: p.email.split('@')[1] ?? ''
  });
  const cached = cache.get(key);
  if (cached) return cached;

  const fallback = buildFallbackExplanation(p);
  if (!client) {
    cache.set(key, fallback);
    return fallback;
  }

  try {
    const prompt = buildPrompt(p);
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a concise risk analyst for a payment router.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 140
    });
    const text = response.choices[0]?.message?.content?.trim();
    const result = text || fallback;
    cache.set(key, result);
    return result;
  } catch (_err) {
    cache.set(key, fallback);
    return fallback;
  }
}

function buildPrompt(p: ExplainParams): string {
  const reasons = p.heuristics.map(h => `${h.rule} (+${h.impact.toFixed(2)})${h.detail ? `: ${h.detail}` : ''}`).join(', ');
  const action = p.chosen === 'blocked' ? 'blocked for risk' : `routed to ${p.chosen}`;
  return `Amount ${p.amount} ${p.currency}; email ${p.email}; risk score ${p.riskScore.toFixed(2)}. Reasons: ${reasons}. Explain in one or two sentences why it was ${action}, in plain language suitable for a support agent.`;
}

function buildFallbackExplanation(p: ExplainParams): string {
  const parts: string[] = [];
  if (p.riskScore >= 0.5) {
    parts.push('The payment was blocked due to elevated fraud risk');
  } else {
    parts.push(`This payment was routed to ${p.chosen} based on low to moderate risk`);
  }
  const reasonText = p.heuristics.map(h => h.rule.replace('_', ' ')).join(', ');
  if (reasonText) parts.push(`influenced by: ${reasonText}.`);
  return parts.join(' ') + ` Risk score: ${p.riskScore.toFixed(2)}.`;
}


