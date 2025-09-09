# Fraud Router API

Lightweight TypeScript API that scores fraud risk and routes charges to Stripe or PayPal simulations, with LLM-generated explanations.

## Setup

1. Install deps:
```bash
npm install
```

2. (Optional) Set an OpenAI API key for better explanations:
```bash
export OPENAI_API_KEY=sk-...
```

3. Run in dev:
```bash
npm run dev
```

## Endpoints

- POST `/charge`
```json
{
  "amount": 1000,
  "currency": "USD",
  "source": "tok_test",
  "email": "donor@example.com"
}
```

- GET `/transactions`

## Sample Input/Output

### Example: Routed (low risk)
Request:
```bash
curl -s -X POST http://localhost:3000/charge \
  -H "Content-Type: application/json" \
  -d '{"amount":1000,"currency":"USD","source":"tok_test","email":"donor@example.com"}'
```

Possible response:
```json
{
  "transactionId": "txn_abc123",
  "provider": "stripe",
  "status": "success",
  "riskScore": 0.18,
  "explanation": "This payment was routed to stripe based on low to moderate risk influenced by: high_amount. Risk score: 0.18."
}
```

### Example: Blocked (high risk)
Request:
```bash
curl -s -X POST http://localhost:3000/charge \
  -H "Content-Type: application/json" \
  -d '{"amount":5000000,"currency":"USD","source":"tok_test","email":"attacker@test.com"}'
```

Possible response:
```json
{
  "transactionId": "txn_def456",
  "status": "blocked",
  "riskScore": 0.73,
  "explanation": "The payment was blocked due to elevated fraud risk influenced by: high amount, suspicious domain. Risk score: 0.73."
}
```

## Tests
```bash
npm test
```

## Config
Fraud rules are in `fraud.rules.json`.

## Fraud logic

The fraud score is computed in `src/services/fraudScoring.ts` using simple, configurable heuristics from `fraud.rules.json`:

- High amount: if `amount >= amountHighThreshold` add `amountHighImpact` to the score.
- Suspicious email domain: if the email domain ends with any item in `suspiciousDomains`, add `suspiciousDomainImpact`.
- Jitter: a small random `jitter` is added to avoid hard edges. The score is clamped to 0..1.

Provider selection and blocking:

- If `score >= 0.5`, the charge is blocked.
- Otherwise, choose provider by risk: `stripe` for low risk (`score < 0.25`), `paypal` for medium risk.
- Final status may still be blocked if the chosen provider simulation fails.

These behaviors are enforced in `src/web/chargeRouter.ts`.

## LLM-generated explanations

Human-friendly explanations are produced in `src/services/llm.ts`:

- If `OPENAI_API_KEY` is set, the service calls OpenAI (`gpt-4o-mini`) with a concise prompt containing amount, currency, email, rounded risk score, and heuristic reasons.
- If no key is set or the API errors, a deterministic fallback explanation is returned.
- Responses are cached by a stable key (rounded score, reason rules, decision, amount, currency, email domain) to avoid repeated calls.

## Docker
Build and run:
```bash
docker build -t fraud-router .
docker run -p 3000:3000 -e OPENAI_API_KEY=$OPENAI_API_KEY fraud-router
```


