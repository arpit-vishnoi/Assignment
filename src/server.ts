import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import morgan from 'morgan';
import { chargeRouter } from './web/chargeRouter.js';
import { transactionsRouter } from './web/transactionsRouter.js';

const app = express();
app.use(express.json());
app.use(morgan('dev'));

app.use('/charge', chargeRouter);
app.use('/transactions', transactionsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.name === 'ZodError') {
    return res.status(400).json({ error: 'Invalid request', details: err.issues });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export default app;

