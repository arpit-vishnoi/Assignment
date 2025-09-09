import express from 'express';
import { z } from 'zod';
import { scoreFraudRisk } from '../services/fraudScoring.js';
import { explainRisk } from '../services/llm.js';
import { chargeWithProvider } from '../services/providers.js';
import { transactionsStore } from '../services/transactionsStore.js';
import { v4 as uuidv4 } from 'uuid';

export const chargeRouter = express.Router();

const ChargeSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().min(3),
  source: z.string().min(1),
  email: z.string().email(),
});

chargeRouter.post('/', async (req, res, next) => {
  try {
    const parsed = ChargeSchema.parse(req.body);
    const risk = scoreFraudRisk(parsed);

    let status: 'blocked' | 'success' = 'success';
    let provider: 'stripe' | 'paypal' | null = null;
    let transactionId = uuidv4();

    if (risk.score >= 0.5) {
      status = 'blocked';
    } else {
      provider = risk.preferredProvider;
    }

    let providerResponse: { provider?: 'stripe' | 'paypal'; ok: boolean } = { ok: false };
    if (status === 'success' && provider) {
      providerResponse = await chargeWithProvider(provider, parsed);
      status = providerResponse.ok ? 'success' : 'blocked';
    }

    const explanation = await explainRisk({
      riskScore: risk.score,
      heuristics: risk.reasons,
      chosen: status === 'blocked' ? 'blocked' : provider || 'unknown',
      amount: parsed.amount,
      currency: parsed.currency,
      email: parsed.email,
    });

    const record = {
      id: transactionId,
      timestamp: new Date().toISOString(),
      request: parsed,
      riskScore: risk.score,
      reasons: risk.reasons,
      status,
      provider: providerResponse.provider ?? provider,
      explanation,
    };
    transactionsStore.add(record);

    if (status === 'blocked') {
      return res.status(403).json({
        transactionId,
        status,
        riskScore: risk.score,
        explanation,
      });
    }

    return res.status(200).json({
      transactionId,
      provider: providerResponse.provider ?? provider,
      status,
      riskScore: risk.score,
      explanation,
    });
  } catch (err) {
    next(err);
  }
});


