import rules from '../../fraud.rules.json' assert { type: 'json' };

type ChargeInput = {
  amount: number;
  currency: string;
  source: string;
  email: string;
};

export type FraudReason = {
  rule: string;
  impact: number; // 0..1 added to score
  detail?: string;
};

export function scoreFraudRisk(input: ChargeInput): { score: number; reasons: FraudReason[]; preferredProvider: 'stripe' | 'paypal' } {
  const reasons: FraudReason[] = [];
  let score = 0;

  if (input.amount >= (rules.amountHighThreshold ?? 5000)) {
    const impact = rules.amountHighImpact ?? 0.3;
    reasons.push({ rule: 'high_amount', impact, detail: `Amount ${input.amount}` });
    score += impact;
  }

  const email = input.email.toLowerCase();
  const domain = email.split('@')[1] || '';
  for (const suspicious of rules.suspiciousDomains ?? ['.ru', 'test.com']) {
    if (domain.endsWith(suspicious)) {
      const impact = rules.suspiciousDomainImpact ?? 0.3;
      reasons.push({ rule: 'suspicious_domain', impact, detail: domain });
      score += impact;
      break;
    }
  }

  // small randomness to avoid always same score borders
  const jitter = (rules.jitter ?? 0.05) * Math.random();
  score = Math.min(1, Math.max(0, score + jitter));

  // prefer paypal for medium-ish risk, stripe for low risk
  const preferredProvider = score < 0.25 ? 'stripe' : 'paypal';

  return { score, reasons, preferredProvider };
}


