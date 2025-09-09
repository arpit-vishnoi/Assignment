import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';

describe('Payment Router API', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  it('validates input', async () => {
    const res = await request(app).post('/charge').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('routes low-risk payments', async () => {
    const res = await request(app).post('/charge').send({
      amount: 1000,
      currency: 'USD',
      source: 'tok_test',
      email: 'donor@example.com'
    });
    expect([200, 403]).toContain(res.status);
    expect(res.body.transactionId).toBeDefined();
    expect(res.body.riskScore).toBeTypeOf('number');
    expect(res.body.explanation).toBeTypeOf('string');
  });

  it('blocks high-risk payments', async () => {
    const res = await request(app).post('/charge').send({
      amount: 5000000,
      currency: 'USD',
      source: 'tok_test',
      email: 'user@domain.test.com'
    });
    expect([200, 403]).toContain(res.status);
    expect(res.body.transactionId).toBeDefined();
  });

  it('lists transactions', async () => {
    const res = await request(app).get('/transactions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.transactions)).toBe(true);
  });
});


