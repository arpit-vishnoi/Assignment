import express from 'express';
import { transactionsStore } from '../services/transactionsStore.js';

export const transactionsRouter = express.Router();

transactionsRouter.get('/', (_req, res) => {
  res.json({ transactions: transactionsStore.getAll() });
});


