type ChargeInput = {
  amount: number;
  currency: string;
  source: string;
  email: string;
};

export async function chargeWithProvider(provider: 'stripe' | 'paypal', input: ChargeInput): Promise<{ ok: boolean; provider: 'stripe' | 'paypal' }> {
  // Simulate network latency and random success
  await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
  const successProbability = provider === 'stripe' ? 0.96 : 0.94;
  const ok = Math.random() < successProbability;
  return { ok, provider };
}


